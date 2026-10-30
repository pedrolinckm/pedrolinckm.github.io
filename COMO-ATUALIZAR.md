# Como atualizar o site

## Publicações (automático)

Todo dia o workflow **Sincronizar publicações** (aba *Actions*) consulta:

1. **ORCID** (`author.orcid` no `_config.yml`): fonte principal.
2. **arXiv**: o feed `arxiv.org/a/<seu ORCID>`, que só funciona se o ORCID estiver ligado à sua conta do arXiv.
3. **Google Scholar** (opcional): via [SerpApi](https://serpapi.com), porque o Scholar não tem API e bloqueia robôs. Para ligar, crie uma conta gratuita, copie a API key e salve em *Settings > Secrets and variables > Actions > New repository secret* com o nome `SERPAPI_KEY`.

Os dados são completados pelo Crossref (autores, revista, volume, resumo) e pela API do arXiv. Quando há algo novo, o workflow cria o arquivo em `_publications/` e o site se reconstrói sozinho. Para rodar na hora: *Actions > Sincronizar publicações > Run workflow*.

### Para o ORCID receber seus trabalhos sozinho (configurar uma vez)

- **Artigos publicados**: no ORCID, *Works > Add > Search & link > Crossref Metadata Search* e autorize o Crossref. Quando uma revista registrar um DOI com o seu ORCID (informe o ORCID ao submeter), o Crossref manda o trabalho para a caixa de entrada do ORCID; aprove uma vez e as próximas entram sozinhas.
- **Preprints do arXiv**: em [DataCite Commons](https://commons.datacite.org), faça login com o ORCID e ative *ORCID Auto-Update*. Ligue também o ORCID na sua conta do arXiv (*user page > Link ORCID iD*), o que ativa a fonte 2 acima.

### Regras

- Arquivos criados pelo sincronizador têm `auto_sync: true` e são atualizados sozinhos.
- Arquivos escritos à mão **não são sobrescritos**. Exceção: se um trabalho `inpreparation` ou `preprints` sair publicado, ele é promovido (mudam só `category`, `venue`, `date`, `paperurl`, `doi` e `citation`; título, resumo e texto ficam). Para travar um arquivo, ponha `auto_sync: false` nele.
- Nada é apagado. Para esconder algo, adicione o título, DOI ou ID do arXiv em `_data/publications_ignore.yml`.
- Trabalhos "em preparação" continuam manuais: crie o arquivo com `category: inpreparation`.

## Notas de aula (arrastar e soltar)

Cada curso tem uma pasta em `lecture-notes/`. Para adicionar uma nota:

1. No GitHub, abra `lecture-notes/<curso>/`.
2. *Add file > Upload files*, arraste os PDFs, *Commit changes*.

Pronto: em um ou dois minutos o PDF aparece na página do curso. O título é o nome do arquivo e a ordem é por nome, com números comparados como números:

| Nome do arquivo | Aparece como |
|---|---|
| `lecture-3.pdf` | Lecture 3 |
| `03 - Espaços vetoriais.pdf` | 03 - Espaços vetoriais |
| `lista_de_exercicios_1.pdf` | Lista de exercicios 1 |

Para renomear ou remover, renomeie ou apague o arquivo.

### Curso novo

1. Crie `_teaching/<nome-do-curso>.md`:

   ```markdown
   ---
   title: "Mecânica Quântica 1"
   collection: teaching
   type: "Undergraduate course"
   permalink: /teaching/quantum-mechanics-1/
   venue: "Universidade Federal de Pernambuco, Physics Department"
   location: "Recife, Brazil"
   excerpt: "Lecture notes and problem sets."
   lecture_notes: quantum-mechanics-1
   ---

   Descrição do curso.

   ## Lecture notes

   {% include lecture-notes.html %}
   ```

2. Suba os PDFs em `lecture-notes/quantum-mechanics-1/` (o upload cria a pasta).

### Notas antigas nos Releases

As notas de Álgebra Linear e Cálculo 4 continuam nos Releases e estão listadas em `_data/lectures_linear_algebra.yml` e `_data/lectures_calculus_4.yml`. Notas novas desses cursos podem ir direto em `lecture-notes/linear-algebra/` e `lecture-notes/calculus-4/`; elas aparecem depois das antigas.

## Observação

O GitHub desativa workflows agendados em repositórios públicos depois de 60 dias sem nenhum commit. Se isso acontecer, você recebe um e-mail; basta reativar em *Actions*.

## Simulações

Cada simulação é um arquivo em `_simulations/` mais um script em `assets/simulations/`. A galeria em `/simulations/` se monta sozinha a partir desses arquivos.

Para adicionar uma:

1. Crie `assets/simulations/minha-simulacao.js`. O script procura o próprio bloco pela `id` e pode usar os utilitários de `assets/simulations/sim-common.js` (`Sim.fitCanvas`, `Sim.colors`, `Sim.onThemeChange`, `Sim.bindRange` e outros), que já cuidam de tela retina e do modo escuro. Os quatro scripts existentes servem de modelo.
2. Crie `_simulations/minha-simulacao.md`:

   ```markdown
   ---
   title: "Nome da simulação"
   excerpt: "Uma ou duas frases que aparecem no cartão da galeria."
   order: 5
   thumbnail: /images/simulations/minha-simulacao.png
   sim_script: minha-simulacao.js
   ---

   <div class="sim" id="minha-simulacao">
     <div class="sim__views">
       <div class="sim__stage"><canvas data-role="canvas"></canvas></div>
     </div>
     <div class="sim__panel">
       <!-- botões (sim-btn), campos (sim__field), leituras (sim__readout) -->
     </div>
   </div>

   ## A física

   Texto em Markdown, com equações entre $$ ... $$.
   ```

3. Ponha uma imagem 16:10 em `images/simulations/` para o cartão (uma captura de tela da própria simulação serve).

Regras práticas:

- Não escreva `<script>` dentro do `.md`: o layout do tema compacta o HTML e quebra scripts embutidos. Todo código vai no `.js`.
- Dentro das equações, use `\lvert`/`\rvert` em vez de `|` e `\lt` em vez de `<`, para o Markdown não confundir com tabela ou HTML.
- `order` define a posição na galeria.

## Visual

As cores ficam em `_sass/theme/_linck_light.scss` e `_sass/theme/_linck_dark.scss`. Os ajustes de tipografia, cabeçalho e listas ficam em `_sass/layout/_linck.scss`, e os controles das simulações em `_sass/layout/_simulations.scss`. Para voltar às cores antigas, troque `site_theme` no `_config.yml` para `"contrast"` (a tipografia e a faixa espectral continuam; elas saem removendo `"layout/linck"` de `assets/css/main.scss`).
