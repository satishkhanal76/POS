Report fonts are static instances (weight 400 and 700, width 100) of Noto Sans Devanagari, downloaded from https://github.com/google/fonts/tree/main/ofl/notosansdevanagari. The font includes Latin and Devanagari glyphs for English and Nepali reports. See OFL-NotoSansDevanagari.txt for the license.

To regenerate, download NotoSansDevanagari[wdth,wght].ttf from that directory and run fontTools.varLib.instancer with wght=400 wdth=100 and wght=700 wdth=100. Save the outputs as Report-Regular.ttf and Report-Bold.ttf. These files are bundled locally and precached for offline PDF generation.
