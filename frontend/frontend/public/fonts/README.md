# Kyza font assets

Source designs: Inter, Roboto, IBM Plex Sans, Montserrat, Poppins, Outfit, Playfair Display, Libre Baskerville, Roboto Mono and IBM Plex Mono, obtained from the Google Fonts repository.

Each family directory includes its original OFL notice. Preserve these notices with redistribution. Original font copyright and licence metadata are retained in the webfont files.

The static regular/bold web assets are derived at weight 400/700 and use internal family names KyzaStudio1 through KyzaStudio10 in the source-family order above. The UI uses source-family labels for identification. Numeric JSON files contain advances and vector glyph outlines at the corresponding weight for document export.

See `manifest.json` for original source URLs and SHA-256 hashes. Rebuild explicitly with `scripts/build-kyza-font-library.py`; ordinary application builds use the bundled assets and do not fetch external fonts.
