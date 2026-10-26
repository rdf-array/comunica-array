<img src=".github/rdf-array-logo.png" alt="[comunica]" width="96" align="right">

# comunica-array: Comunica for rdf-array

**RDF-** fork of [Comunica](https://github.com/comunica/comunica): a SPARQL engine over an RDF data
model whose fifth kind of term is the **sequence**, `(1 2 3)`, in place of `rdf:first`/`rdf:rest`
ladders; `()` is the empty sequence, not `rdf:nil`. A collection in Turtle data or in a SPARQL
pattern is one term, so `?s :p (?x (2 3) ?o)` binds `?x` and `?o` from a matching sequence,
`CONSTRUCT { ?s :r (?x 9) }` builds one, `FILTER(?o = (1 2))`, `ORDER BY` and `DISTINCT` compare
them whole, and the SPARQL JSON, XML, CSV and TSV writers spell them (`{"type": "seq", "value":
[...]}`, `<seq>`, `(...)`). The term comes from the forks of the data model and term libraries,
Turtle from [N3.js-array](https://github.com/rdf-array/N3.js-array), SPARQL parsing, generation and
algebra from [traqula-array](https://github.com/rdf-array/traqula-array); `resolutions` in
package.json pin them, and traqula-array is linked from a checkout beside this one
(`git clone` both under the same directory, build traqula-array, then `yarn install` here).
[doc/rdf-array.md](doc/rdf-array.md) has the details, the sibling forks, the flagged tests and what
is not done.

---

<p align="center">
  <a href="https://comunica.dev/">
    <img alt="Comunica" src="https://comunica.dev/img/comunica_red.svg" width="200">
  </a>
</p>

<p align="center">
  <strong>A knowledge graph querying framework for JavaScript</strong>
  <br />
  <i>Flexible SPARQL and GraphQL over decentralized RDF on the Web.</i>
</p>

<p align="center">
  <a href="https://github.com/comunica/comunica/actions/workflows/ci.yml"><img src="https://github.com/comunica/comunica/actions/workflows/ci.yml/badge.svg?branch=master" alt="Build Status"></a>
  <a href="https://coveralls.io/github/comunica/comunica?branch=master"><img src="https://coveralls.io/repos/github/comunica/comunica/badge.svg?branch=master" alt="Coverage Status"></a>
  <a href="https://zenodo.org/badge/latestdoi/107345960"><img src="https://zenodo.org/badge/107345960.svg" alt="DOI"></a>
  <a href="https://gitter.im/comunica/Lobby"><img src="https://img.shields.io/gitter/room/comunica/Lobby.svg?label=Lobby-Chat" alt="Gitter Lobby chat"></a>
  <a href="https://gitter.im/comunica/core-dev"><img src="https://img.shields.io/gitter/room/comunica/Lobby.svg?label=Dev-Chat" alt="Gitter Dev chat"></a>
</p>

<p align="center">
  <a href="https://comunica.github.io/comunica/"><img src="https://img.shields.io/badge/doc-code_documentation-blueviolet"/></a>
</p>

**[Learn more about Comunica on our website](https://comunica.dev/).**

Comunica is an open-source project that is used by [many other projects](https://github.com/comunica/comunica/network/dependents),
and is being maintained by a [group of volunteers](https://github.com/comunica/comunica/graphs/contributors).
If you would like to support this project, you may consider:

* Contributing directly by [writing code or documentation](https://comunica.dev/contribute/); or
* Contributing indirectly by funding this project via [Open Collective](https://opencollective.com/comunica-association).

## Supported by

Comunica is a community-driven project, sustained by the [Comunica Association](https://comunica.dev/association/).
If you are using Comunica, [becoming a sponsor or member](https://opencollective.com/comunica-association) is a way to make Comunica sustainable in the long-term.

Our top sponsors are shown below!

<a href="https://opencollective.com/comunica-association/sponsor/0/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/1/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/2/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/3/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/3/avatar.svg"></a>

## Query with Comunica

Read one of our [guides to **get started** with querying](https://comunica.dev/docs/query/getting_started/):

* [Querying from the command line](https://comunica.dev/docs/query/getting_started/query_cli/)
* [Updating from the command line](https://comunica.dev/docs/query/getting_started/update_cli/)
* [Querying local files from the command line](https://comunica.dev/docs/query/getting_started/query_cli_file/)
* [Querying in a JavaScript app](https://comunica.dev/docs/query/getting_started/query_app/)
* [Updating in a JavaScript app](https://comunica.dev/docs/query/getting_started/update_app/)
* [Querying in a JavaScript browser app](https://comunica.dev/docs/query/getting_started/query_browser_app/)
* [Setting up a SPARQL endpoint](https://comunica.dev/docs/query/getting_started/setup_endpoint/)
* [Querying from a Docker container](https://comunica.dev/docs/query/getting_started/query_docker/)
* [Setting up a Web client](https://comunica.dev/docs/query/getting_started/setup_web_client/)
* [Query using the latest development version](https://comunica.dev/docs/query/getting_started/query_dev_version/)

Or jump right into one of the available query engines:
* [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/engines/query-sparql#readme): SPARQL/GraphQL querying from JavaScript applications or the CLI ([Browser-ready via a CDN](https://github.com/rdfjs/comunica-browser))

 - Engines with support for specific types of sources
   * [Comunica SPARQL File](https://github.com/comunica/comunica/tree/master/engines/query-sparql-file#readme): Engine to query over local RDF files
   * [Comunica SPARQL RDF/JS](https://github.com/comunica/comunica/tree/master/engines/query-sparql-rdfjs#readme): Engine to query over in-memory [RDF/JS-compliant sources](https://rdf.js.org/stream-spec/#source-interface).
   * [Comunica SPARQL RDF/JS Lite](https://github.com/comunica/comunica/tree/master/engines/query-sparql-rdfjs-lite#readme): Engine optimized for small bundle size to query over in-memory [RDF/JS-compliant sources](https://rdf.js.org/stream-spec/#source-interface).
   * [Comunica SPARQL HDT](https://github.com/comunica/comunica-feature-hdt/tree/master/engines/query-sparql-hdt#readme): Library to query over local [HDT](https://www.rdfhdt.org/) files
   * [Comunica SPARQL OSTRICH](https://github.com/comunica/comunica-feature-versioning/tree/master/engines/query-sparql-ostrich#readme): Library to query over local versioned [OSTRICH](https://github.com/rdfostrich/ostrich) archives
   * [Comunica MCP](https://github.com/comunica/comunica-feature-mcp/): [MCP](https://modelcontextprotocol.io/) wrappers over most Comunica engines for interaction with AI agents.

 - Engines with alternative querying paradigms:
   * [Comunica SPARQL Link Traversal](https://github.com/comunica/comunica-feature-link-traversal/tree/master/engines/query-sparql-link-traversal#readme): Engine to query over multiple files by following links between them.
   * [Comunica SPARQL Solid](https://github.com/comunica/comunica-feature-solid/tree/master/engines/query-sparql-solid#readme): Engine to query over files behind [Solid access control](https://solidproject.org/).
   * [Comunica SPARQL Link Traversal Solid](https://github.com/comunica/comunica-feature-link-traversal/tree/master/engines/query-sparql-link-traversal-solid#readme): Engine to query within [Solid data vaults](https://solidproject.org/) by following links between documents.
   * [Comunica SPARQL Reasoning](https://github.com/comunica/comunica-feature-reasoning/tree/master/engines/query-sparql-reasoning): Engine that adds support for reasoning
   * [Comunica SPARQL Reasoning File](https://github.com/comunica/comunica-feature-reasoning/tree/master/engines/query-sparql-file-reasoning): Engine to query over local RDF files with support for reasoning

 - Engines that expose a part of Comunica on their own:
   * [Comunica SPARQL Expressions](https://github.com/comunica/comunica/tree/master/engines/expressions-sparql#readme): Engine to evaluate SPARQL expressions, aggregates and term ordering without querying.

## Modify or Extend Comunica

[Read one of our guides to **get started** with modifying Comunica](https://comunica.dev/docs/modify/),
or have a look at some [examples](https://github.com/comunica/examples):

* [Querying with a custom configuration from the command line](https://comunica.dev/docs/modify/getting_started/custom_config_cli/)
* [Querying with a custom configuration in a JavaScript app](https://comunica.dev/docs/modify/getting_started/custom_config_app/)
* [Exposing your custom config as an npm package](https://comunica.dev/docs/modify/getting_started/custom_init/)
* [Exposing your custom config in a Web client](https://comunica.dev/docs/modify/getting_started/custom_web_client/)
* [Contributing a new query operation actor to the Comunica repository](https://comunica.dev/docs/modify/getting_started/contribute_actor/)
* [Adding a config parameter to an actor](https://comunica.dev/docs/modify/getting_started/actor_parameter/)

## Contribute

Interested in contributing? Have a look at our [contribution guide](https://comunica.dev/contribute/).

## Development Setup

_(JSDoc: https://comunica.github.io/comunica/)_

This repository should be used by Comunica module **developers** as it contains multiple Comunica modules that can be composed.
This repository is managed as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

If you want to develop new features
or use the (potentially unstable) in-development version,
you can set up a development environment for Comunica.

Comunica requires [Node.JS](http://nodejs.org/) and the [Yarn](https://yarnpkg.com/en/) package manager (only when using this repo).
Comunica is tested on OSX, Linux and Windows.

This project can be setup by cloning and installing it as follows:

```bash
$ git clone https://github.com/comunica/comunica.git
$ cd comunica
$ yarn install
```

**Note: `npm install` is not supported at the moment, as this project makes use of Yarn's [workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) functionality**

This will install the dependencies of all modules, and bootstrap the Lerna monorepo.
After that, all [Comunica packages](https://github.com/comunica/comunica/tree/master/packages) are available in the `packages/` folder,
and the [Comunica engines](https://github.com/comunica/comunica/tree/master/engines) are available in the `engines/` folder.
These can be used in a development environment, such as querying with [Comunica SPARQL (`@comunica/query-sparql`)](https://github.com/comunica/comunica/tree/master/engines/query-sparql).

Furthermore, this will add pre-commit hooks using [husky](https://www.npmjs.com/package/husky) to build, lint and test.
These hooks can temporarily be disabled at your own risk by adding the `-n` flag to the commit command.

## Benchmarking

If you want to do benchmarking with Comunica in Node.js,
make sure to run Node.js in production mode as follows:

```bash
> NODE_ENV=production node packages/some-package/bin/some-bin.js
```

Read more about benchmarking [on our website](https://comunica.dev/docs/modify/benchmarking/).

## Cite

If you are using or extending Comunica as part of a scientific publication,
we would appreciate a citation of our [article](https://comunica.github.io/Article-ISWC2018-Resource/).

```bibtex
@inproceedings{taelman_iswc_resources_comunica_2018,
  author    = {Taelman, Ruben and Van Herwegen, Joachim and Vander Sande, Miel and Verborgh, Ruben},
  title     = {Comunica: a Modular SPARQL Query Engine for the Web},
  booktitle = {Proceedings of the 17th International Semantic Web Conference},
  year      = {2018},
  month     = oct,
  url       = {https://comunica.github.io/Article-ISWC2018-Resource/}
}
```

## License
This code is copyrighted by [the Comunica Association](https://comunica.dev/association/) and [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
