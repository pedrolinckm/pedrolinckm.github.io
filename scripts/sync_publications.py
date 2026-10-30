#!/usr/bin/env python3
"""
Sincroniza a lista de publicações do site com fontes externas.

Fontes (todas opcionais, cada uma falha sem derrubar as outras):
  1. ORCID          - fonte principal; lida de author.orcid no _config.yml
  2. arXiv          - feed de autor ligado ao ORCID (arxiv.org/a/<ORCID>)
  3. Google Scholar - via SerpApi, só se a variável SERPAPI_KEY existir;
                      o ID do perfil vem de author.googlescholar no _config.yml

Os metadados são completados com Crossref (DOIs) e com a API do arXiv
(autores, resumo, versão publicada).

Regras de escrita em _publications/:
  * Arquivos criados por este script levam `auto_sync: true` e são
    reescritos a cada execução (o corpo do arquivo é preservado).
  * Arquivos escritos à mão nunca são sobrescritos. A única exceção é a
    "promoção": se um trabalho seu que está como `inpreparation` ou
    `preprints` aparecer publicado em periódico, o script atualiza só
    category, venue, date, paperurl, doi e citation, e mantém o resto.
    Para impedir até isso, ponha `auto_sync: false` no arquivo.
  * Nada é apagado.
  * Para esconder um trabalho, liste o título, DOI ou ID do arXiv em
    _data/publications_ignore.yml.

Uso:
  python scripts/sync_publications.py            # aplica as mudanças
  python scripts/sync_publications.py --dry-run  # só mostra o que faria
"""

from __future__ import annotations

import argparse
import datetime
import difflib
import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
PUB_DIR = ROOT / "_publications"
CONFIG = ROOT / "_config.yml"
IGNORE_FILE = ROOT / "_data" / "publications_ignore.yml"

USER_AGENT = "pedrolinckm.github.io publication sync (+https://github.com/pedrolinckm/pedrolinckm.github.io)"
ATOM = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"

# Ordem de "maturidade": um registro com rank maior substitui um menor.
CATEGORY_RANK = {"other": 0, "inpreparation": 1, "preprints": 2, "conference": 3, "journal": 4}

ORCID_TYPE_TO_CATEGORY = {
    "journal-article": "journal",
    "preprint": "preprints",
    "working-paper": "preprints",
    "conference-paper": "conference",
    "conference-proceedings": "conference",
}
CROSSREF_TYPE_TO_CATEGORY = {
    "journal-article": "journal",
    "posted-content": "preprints",
    "proceedings-article": "conference",
}


def log(msg: str) -> None:
    print(msg, flush=True)


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

def http_get(url: str, accept: str = "application/json", retries: int = 3) -> bytes:
    """GET com algumas tentativas. Lança a última exceção se tudo falhar."""
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"Accept": accept, "User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (400, 401, 403, 404):
                break
        except Exception as e:  # rede, timeout
            last = e
        time.sleep(2 * (attempt + 1))
    assert last is not None
    raise last


def get_json(url: str) -> dict:
    return json.loads(http_get(url).decode("utf-8"))


# --------------------------------------------------------------------------
# Normalização
# --------------------------------------------------------------------------

def norm_title(title: str) -> str:
    t = unicodedata.normalize("NFKD", title or "")
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"[^a-z0-9]+", " ", t.lower())
    return " ".join(t.split())


def titles_match(a: str, b: str) -> bool:
    na, nb = norm_title(a), norm_title(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    return difflib.SequenceMatcher(None, na, nb).ratio() >= 0.93


def norm_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    d = doi.strip()
    d = re.sub(r"^(https?://)?(dx\.)?doi\.org/", "", d, flags=re.I)
    d = re.sub(r"^doi:\s*", "", d, flags=re.I)
    return d or None


def same_doi(a: str | None, b: str | None) -> bool:
    return bool(a and b and a.lower() == b.lower())


ARXIV_RE = re.compile(r"(\d{4}\.\d{4,5}|[a-z\-]+(?:\.[A-Z]{2})?/\d{7})(v\d+)?", re.I)


def norm_arxiv(value: str | None) -> str | None:
    """Extrai o ID do arXiv (sem versão) de um ID, URL ou DOI 10.48550."""
    if not value:
        return None
    v = value.strip()
    v = re.sub(r"^(https?://)?(dx\.)?doi\.org/", "", v, flags=re.I)
    v = re.sub(r"^10\.48550/arxiv\.", "", v, flags=re.I)
    v = re.sub(r"^(https?://)?(www\.)?(export\.)?arxiv\.org/(abs|pdf)/", "", v, flags=re.I)
    v = re.sub(r"^arxiv:\s*", "", v, flags=re.I)
    v = re.sub(r"\.pdf$", "", v)
    m = ARXIV_RE.search(v)
    return m.group(1).lower() if m else None


def clean_text(text: str | None) -> str:
    if not text:
        return ""
    t = re.sub(r"<jats:title>.*?</jats:title>", " ", text, flags=re.S | re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = " ".join(t.split())
    t = re.sub(r"^(abstract)[\s.:]+", "", t, flags=re.I)
    return t.strip()


def slugify(title: str, max_words: int = 8) -> str:
    words = norm_title(title).split()
    return "-".join(words[:max_words]) or "publication"


# --------------------------------------------------------------------------
# Modelo de registro
# --------------------------------------------------------------------------

@dataclass
class Record:
    title: str
    category: str = "other"
    authors: list[str] = field(default_factory=list)
    year: int | None = None
    month: int | None = None
    day: int | None = None
    venue: str = ""
    volume: str = ""
    issue: str = ""
    pages: str = ""
    doi: str | None = None       # DOI da versão publicada (nunca 10.48550)
    arxiv: str | None = None
    url: str = ""
    abstract: str = ""
    sources: set[str] = field(default_factory=set)

    @property
    def rank(self) -> int:
        return CATEGORY_RANK.get(self.category, 0)

    def date_obj(self) -> datetime.date:
        return datetime.date(self.year or 1900, self.month or 1, self.day or 1)

    def date_str(self) -> str:
        y = self.year or 1900
        m = self.month or 1
        d = self.day or 1
        return f"{y:04d}-{m:02d}-{d:02d}"

    def paper_url(self) -> str:
        if self.doi:
            return f"https://doi.org/{self.doi}"
        if self.arxiv:
            return f"https://arxiv.org/abs/{self.arxiv}"
        return self.url

    def venue_text(self) -> str:
        if self.venue:
            return self.venue
        if self.arxiv:
            return "arXiv preprint"
        return ""

    def citation(self) -> str:
        names = [a for a in self.authors if a]
        if len(names) > 2:
            who = ", ".join(names[:-1]) + ", and " + names[-1]
        else:
            who = " and ".join(names)
        parts = []
        if who:
            parts.append(html.escape(who, quote=False))
        if self.year:
            parts.append(f"({self.year}).")
        parts.append(f"&quot;{html.escape(self.title, quote=False)}.&quot;")
        if self.category in ("journal", "conference") and self.venue:
            v = f"<i>{html.escape(self.venue, quote=False)}</i>"
            if self.volume:
                v += f" {self.volume}"
                if self.issue:
                    v += f"({self.issue})"
            if self.pages:
                v += f", {self.pages}"
            parts.append(v + ".")
        elif self.arxiv:
            parts.append(f"<i>arXiv</i>:{self.arxiv}.")
        elif self.venue:
            parts.append(f"<i>{html.escape(self.venue, quote=False)}</i>.")
        return " ".join(parts)

    def absorb(self, other: "Record", prefer_other: bool = False) -> None:
        """Junta outro registro do mesmo trabalho. O mais "maduro" manda;
        em caso de empate, `prefer_other` decide."""
        if other.rank > self.rank or (prefer_other and other.rank == self.rank):
            primary, secondary = other, self
        else:
            primary, secondary = self, other
        merged = Record(title=primary.title or secondary.title, category=primary.category)
        for attr in ("authors", "year", "month", "day", "venue", "volume", "issue", "pages", "url", "abstract"):
            setattr(merged, attr, getattr(primary, attr) or getattr(secondary, attr))
        # listas de autores do Scholar vêm abreviadas ("P Linck, ..."); prefira a mais longa e completa
        if secondary.authors and len(" ".join(secondary.authors)) > len(" ".join(merged.authors)) and "..." in " ".join(merged.authors):
            merged.authors = secondary.authors
        merged.doi = primary.doi or secondary.doi
        merged.arxiv = primary.arxiv or secondary.arxiv
        merged.sources = primary.sources | secondary.sources
        self.__dict__.update(merged.__dict__)


# --------------------------------------------------------------------------
# Fontes
# --------------------------------------------------------------------------

def _val(obj, *path):
    for key in path:
        if obj is None:
            return None
        obj = obj.get(key) if isinstance(obj, dict) else None
    return obj


def _int(x) -> int | None:
    try:
        return int(x)
    except (TypeError, ValueError):
        return None


def fetch_orcid(orcid: str) -> list[Record]:
    base = f"https://pub.orcid.org/v3.0/{orcid}"
    data = get_json(f"{base}/works")
    summaries = []
    for group in data.get("group", []) or []:
        ws = group.get("work-summary") or []
        if ws:
            summaries.append(ws[0])  # o primeiro é a versão preferida no ORCID

    # Detalhes (autores, resumo) em lotes de até 100.
    details: dict[str, dict] = {}
    codes = [str(s.get("put-code")) for s in summaries if s.get("put-code") is not None]
    for i in range(0, len(codes), 100):
        chunk = ",".join(codes[i:i + 100])
        try:
            bulk = get_json(f"{base}/works/{chunk}")
            for item in bulk.get("bulk", []) or []:
                w = item.get("work")
                if w and w.get("put-code") is not None:
                    details[str(w["put-code"])] = w
        except Exception as e:
            log(f"  aviso: não consegui os detalhes dos trabalhos no ORCID ({e})")

    records = []
    for s in summaries:
        w = details.get(str(s.get("put-code")), s)
        title = _val(w, "title", "title", "value") or ""
        if not title:
            continue
        rec = Record(title=title.strip(), sources={"orcid"})
        rec.category = ORCID_TYPE_TO_CATEGORY.get((w.get("type") or "").lower(), "other")
        pd = w.get("publication-date") or {}
        rec.year = _int(_val(pd, "year", "value"))
        rec.month = _int(_val(pd, "month", "value"))
        rec.day = _int(_val(pd, "day", "value"))
        rec.venue = (_val(w, "journal-title", "value") or "").strip()
        rec.url = _val(w, "url", "value") or ""
        rec.abstract = clean_text(w.get("short-description"))
        for c in _val(w, "contributors", "contributor") or []:
            name = _val(c, "credit-name", "value")
            if name:
                rec.authors.append(name.strip())
        for ext in _val(w, "external-ids", "external-id") or []:
            etype = (ext.get("external-id-type") or "").lower()
            evalue = ext.get("external-id-value") or ""
            if etype == "doi":
                d = norm_doi(evalue)
                if d and d.lower().startswith("10.48550/"):
                    rec.arxiv = rec.arxiv or norm_arxiv(d)
                elif d and ext.get("external-id-relationship", "self") == "self":
                    rec.doi = rec.doi or d
            elif etype == "arxiv":
                rec.arxiv = rec.arxiv or norm_arxiv(evalue)
        if rec.category == "other" and rec.arxiv and not rec.doi:
            rec.category = "preprints"
        records.append(rec)
    return records


def fetch_arxiv_author_feed(orcid: str) -> list[str]:
    raw = http_get(f"https://arxiv.org/a/{orcid}.atom2", accept="application/atom+xml")
    root = ET.fromstring(raw)
    ids = []
    for entry in root.findall(f"{ATOM}entry"):
        aid = norm_arxiv(entry.findtext(f"{ATOM}id") or "")
        if aid:
            ids.append(aid)
    return ids


def fetch_arxiv_metadata(ids: list[str]) -> dict[str, Record]:
    out: dict[str, Record] = {}
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode(
            {"id_list": ",".join(chunk), "max_results": len(chunk)})
        root = ET.fromstring(http_get(url, accept="application/atom+xml"))
        for entry in root.findall(f"{ATOM}entry"):
            aid = norm_arxiv(entry.findtext(f"{ATOM}id") or "")
            title = " ".join((entry.findtext(f"{ATOM}title") or "").split())
            if not aid or not title or title.lower() == "error":
                continue
            rec = Record(title=title, category="preprints", arxiv=aid, sources={"arxiv"})
            rec.abstract = clean_text(entry.findtext(f"{ATOM}summary"))
            rec.authors = [" ".join((a.findtext(f"{ATOM}name") or "").split())
                           for a in entry.findall(f"{ATOM}author")]
            published = entry.findtext(f"{ATOM}published") or ""
            m = re.match(r"(\d{4})-(\d{2})-(\d{2})", published)
            if m:
                rec.year, rec.month, rec.day = (int(g) for g in m.groups())
            rec.venue = "arXiv preprint"
            doi = norm_doi(entry.findtext(f"{ARXIV_NS}doi"))
            if doi and not doi.lower().startswith("10.48550/"):
                rec.doi = doi  # já saiu publicado; o Crossref completa o resto
            out[aid] = rec
        time.sleep(3)  # pedido da API do arXiv
    return out


def fetch_crossref(doi: str) -> Record | None:
    msg = get_json("https://api.crossref.org/works/" + urllib.parse.quote(doi)).get("message", {})
    title = clean_text((msg.get("title") or [""])[0])
    if not title:
        return None
    rec = Record(title=title, doi=norm_doi(doi), sources={"crossref"})
    rec.category = CROSSREF_TYPE_TO_CATEGORY.get(msg.get("type", ""), "other")
    rec.venue = clean_text((msg.get("container-title") or [""])[0])
    rec.volume = str(msg.get("volume") or "")
    rec.issue = str(msg.get("issue") or "")
    rec.pages = str(msg.get("article-number") or msg.get("page") or "")
    for a in msg.get("author") or []:
        name = " ".join(x for x in (a.get("given"), a.get("family")) if x) or a.get("name") or ""
        if name:
            rec.authors.append(name)
    for key in ("published-print", "published-online", "published", "issued"):
        parts = (_val(msg, key, "date-parts") or [[None]])[0]
        if parts and parts[0]:
            rec.year = parts[0]
            rec.month = parts[1] if len(parts) > 1 else None
            rec.day = parts[2] if len(parts) > 2 else None
            break
    rec.abstract = clean_text(msg.get("abstract"))
    return rec


def scholar_user_id(url: str | None) -> str | None:
    if not url:
        return None
    q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    return (q.get("user") or [None])[0]


def fetch_scholar_serpapi(user_id: str, api_key: str) -> list[Record]:
    records = []
    start = 0
    while True:
        params = {"engine": "google_scholar_author", "author_id": user_id, "api_key": api_key,
                  "num": 100, "start": start, "sort": "pubdate", "hl": "en"}
        data = get_json("https://serpapi.com/search.json?" + urllib.parse.urlencode(params))
        if data.get("error"):
            raise RuntimeError(data["error"])
        articles = data.get("articles") or []
        for a in articles:
            title = (a.get("title") or "").strip()
            if not title:
                continue
            pub = a.get("publication") or ""
            rec = Record(title=title, sources={"scholar"})
            rec.authors = [x.strip() for x in (a.get("authors") or "").split(",") if x.strip()]
            rec.year = _int(a.get("year"))
            rec.url = a.get("link") or ""
            aid = norm_arxiv(pub) if "arxiv" in pub.lower() else None
            if aid:
                rec.arxiv, rec.category, rec.venue = aid, "preprints", "arXiv preprint"
            else:
                # "Physical Review A 112 (3), 032627, 2025" -> "Physical Review A" (periódico)
                rec.venue = re.split(r"\s+\d|,", pub, maxsplit=1)[0].strip()
                if re.match(r"^[^\d,]+\s\d+(\s*\(\d+\))?,\s*\S+", pub):
                    rec.category = "journal"
            records.append(rec)
        if len(articles) < 100 or start >= 400:
            break
        start += 100
    return records


# --------------------------------------------------------------------------
# Arquivos existentes
# --------------------------------------------------------------------------

FM_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?(.*)\Z", re.S)


@dataclass
class PubFile:
    path: Path
    meta: dict
    body: str

    @property
    def auto(self) -> bool:
        return self.meta.get("auto_sync") is True

    @property
    def locked(self) -> bool:
        return self.meta.get("auto_sync") is False

    def doi(self) -> str | None:
        d = norm_doi(str(self.meta.get("doi") or ""))
        if d:
            return d
        url = str(self.meta.get("paperurl") or "")
        if "doi.org/" in url:
            d = norm_doi(url)
            if d and not d.lower().startswith("10.48550/"):
                return d
        return None

    def arxiv(self) -> str | None:
        for key in ("arxiv", "paperurl", "arxivurl"):
            v = str(self.meta.get(key) or "")
            if v and ("arxiv" in v.lower() or key == "arxiv"):
                a = norm_arxiv(v)
                if a:
                    return a
        return None

    def matches(self, rec: Record) -> bool:
        if same_doi(self.doi(), rec.doi):
            return True
        if rec.arxiv and self.arxiv() == rec.arxiv:
            return True
        return titles_match(str(self.meta.get("title") or ""), rec.title)


def load_pub_files() -> list[PubFile]:
    files = []
    for p in sorted(PUB_DIR.glob("*.md")):
        m = FM_RE.match(p.read_text(encoding="utf-8"))
        if not m:
            continue
        meta = yaml.safe_load(m.group(1)) or {}
        files.append(PubFile(p, meta, m.group(2)))
    return files


def dump_file(meta: dict, body: str) -> str:
    fm = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=10_000)
    body = body.strip("\n")
    return f"---\n{fm}---\n" + (f"\n{body}\n" if body else "")


def build_meta(rec: Record, old: dict | None = None) -> dict:
    date = rec.date_str()
    slug = slugify(rec.title)
    meta = {
        "title": rec.title,
        "collection": "publications",
        "category": rec.category,
        "permalink": (old or {}).get("permalink") or f"/publication/{date}-{slug}",
        "excerpt": rec.abstract or (old or {}).get("excerpt", ""),
        "date": rec.date_obj(),
        "venue": rec.venue_text(),
        "paperurl": rec.paper_url(),
        "citation": rec.citation(),
    }
    if rec.doi:
        meta["doi"] = rec.doi
    if rec.arxiv:
        meta["arxiv"] = rec.arxiv
    meta["auto_sync"] = True
    meta["sync_sources"] = sorted(rec.sources)
    return meta


def body_for(rec: Record) -> str:
    """Corpo do arquivo: vazio. O layout já mostra resumo e links (DOI, arXiv)."""
    return ""


# --------------------------------------------------------------------------
# Principal
# --------------------------------------------------------------------------

def load_ignore() -> tuple[set[str], set[str], list[str]]:
    """Itens de _data/publications_ignore.yml: DOI, ID/URL do arXiv ou título."""
    if not IGNORE_FILE.exists():
        return set(), set(), []
    items = yaml.safe_load(IGNORE_FILE.read_text(encoding="utf-8")) or []
    dois, arxivs, titles = set(), set(), []
    for it in items:
        s = str(it).strip()
        d = norm_doi(s)
        looks_arxiv = (s.lower().startswith(("arxiv", "10.48550/", "https://arxiv", "http://arxiv"))
                       or re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", s))
        if looks_arxiv and norm_arxiv(s):
            arxivs.add(norm_arxiv(s))
        elif d and re.match(r"10\.\d{4,9}/\S+$", d):
            dois.add(d.lower())
        else:
            titles.append(s)
    return dois, arxivs, titles


def merge(records: list[Record]) -> list[Record]:
    clusters: list[Record] = []
    for rec in records:
        for c in clusters:
            if (same_doi(rec.doi, c.doi) or (rec.arxiv and rec.arxiv == c.arxiv)
                    or titles_match(rec.title, c.title)):
                c.absorb(rec)
                break
        else:
            clusters.append(rec)
    return clusters


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    cfg = yaml.safe_load(CONFIG.read_text(encoding="utf-8")) or {}
    author = cfg.get("author") or {}
    orcid_url = str(author.get("orcid") or os.environ.get("ORCID_ID") or "")
    m = re.search(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]", orcid_url)
    orcid = m.group(0) if m else None
    scholar_id = os.environ.get("SCHOLAR_ID") or scholar_user_id(author.get("googlescholar"))
    serpapi_key = os.environ.get("SERPAPI_KEY", "").strip()

    records: list[Record] = []
    ok_sources = 0

    if orcid:
        try:
            got = fetch_orcid(orcid)
            log(f"ORCID {orcid}: {len(got)} trabalhos")
            records += got
            ok_sources += 1
        except Exception as e:
            log(f"aviso: ORCID indisponível ({e})")
        try:
            ids = fetch_arxiv_author_feed(orcid)
            log(f"arXiv (feed do autor): {len(ids)} preprints")
            records += [Record(title="", arxiv=i, category="preprints", sources={"arxiv"}) for i in ids]
            ok_sources += 1
        except Exception as e:
            log(f"aviso: feed do arXiv indisponível ({e}); normal se o ORCID não estiver ligado à sua conta do arXiv")
    else:
        log("aviso: author.orcid não encontrado no _config.yml")

    if scholar_id and serpapi_key:
        try:
            got = fetch_scholar_serpapi(scholar_id, serpapi_key)
            log(f"Google Scholar {scholar_id}: {len(got)} trabalhos")
            records += got
            ok_sources += 1
        except Exception as e:
            log(f"aviso: Google Scholar (SerpApi) indisponível ({e})")
    elif scholar_id:
        log("Google Scholar: pulado (defina o secret SERPAPI_KEY para ativar)")

    if ok_sources == 0:
        log("Nenhuma fonte respondeu. Nada a fazer.")
        return 0

    # Completa registros com arXiv e Crossref.
    arxiv_ids = sorted({r.arxiv for r in records if r.arxiv})
    arxiv_meta: dict[str, Record] = {}
    if arxiv_ids:
        try:
            arxiv_meta = fetch_arxiv_metadata(arxiv_ids)
        except Exception as e:
            log(f"aviso: API do arXiv indisponível ({e})")
    enriched: list[Record] = []
    for r in records:
        if r.arxiv and r.arxiv in arxiv_meta:
            a = arxiv_meta[r.arxiv]
            if not r.title:
                r = Record(**{**a.__dict__, "sources": set(a.sources)})
            else:
                r.absorb(a)
                r.sources |= {"arxiv"}
        if r.title:
            enriched.append(r)
    # Registros que só existem como versão publicada descoberta pelo arXiv.
    crossref_cache: dict[str, Record | None] = {}
    for r in enriched:
        if r.doi and r.doi.lower() not in crossref_cache:
            try:
                crossref_cache[r.doi.lower()] = fetch_crossref(r.doi)
            except Exception as e:
                crossref_cache[r.doi.lower()] = None
                log(f"aviso: Crossref falhou para {r.doi} ({e})")
        cr = crossref_cache.get(r.doi.lower()) if r.doi else None
        if cr:
            arxiv_id = r.arxiv
            r.absorb(cr, prefer_other=True)  # Crossref é a fonte mais confiável
            r.arxiv = r.arxiv or arxiv_id

    works = merge(enriched)

    ign_dois, ign_arxiv, ign_titles = load_ignore()
    works = [w for w in works
             if not (w.doi and w.doi.lower() in ign_dois)
             and not (w.arxiv and w.arxiv in ign_arxiv)
             and not any(titles_match(w.title, t) for t in ign_titles)]

    files = load_pub_files()
    created = updated = promoted = 0
    for w in sorted(works, key=lambda r: r.date_str()):
        match = next((f for f in files if f.matches(w)), None)
        if match is None:
            meta = build_meta(w)
            name = f"{meta['date']}-{slugify(w.title)}.md"
            path = PUB_DIR / name
            log(f"+ novo: {w.title} [{w.category}] -> {name}")
            if not args.dry_run:
                path.write_text(dump_file(meta, body_for(w)), encoding="utf-8")
            files.append(PubFile(path, meta, body_for(w)))
            created += 1
        elif match.auto:
            meta = build_meta(w, match.meta)
            if meta != match.meta:
                log(f"~ atualizado: {w.title}")
                if not args.dry_run:
                    match.path.write_text(dump_file(meta, match.body or body_for(w)), encoding="utf-8")
                match.meta = meta
                updated += 1
        elif not match.locked:
            old_rank = CATEGORY_RANK.get(str(match.meta.get("category")), 0)
            if w.category in ("journal", "conference", "preprints") and w.rank > old_rank:
                meta = dict(match.meta)
                full = build_meta(w, match.meta)
                for k in ("category", "venue", "date", "paperurl", "citation", "doi"):
                    if k in full:
                        meta[k] = full[k]
                if w.arxiv and "arxiv" not in meta:
                    meta["arxiv"] = w.arxiv
                if not meta.get("excerpt") and w.abstract:
                    meta["excerpt"] = w.abstract
                log(f"^ promovido a {w.category}: {match.meta.get('title')} ({match.path.name})")
                if not args.dry_run:
                    match.path.write_text(dump_file(meta, match.body), encoding="utf-8")
                match.meta = meta
                promoted += 1

    log(f"Resumo: {created} novos, {updated} atualizados, {promoted} promovidos"
        + (" (dry-run, nada foi gravado)" if args.dry_run else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
