# CrateAI Record Identification Rules

These rules apply to every future record-photo search and library import.

## Required Evidence

1. Read all legible text in every photo in the same record group.
2. Use the front-cover artwork and back-cover artwork as visual evidence.
3. Search using both the extracted text and visual description of the jacket.
4. Verify the candidate against the photographed tracklist, credits, label, catalog/barcode details, release year, and number of discs when available.
5. Confirm the exact vinyl edition or reissue. Do not substitute a streaming cover, CD cover, standard edition, or a different pressing when the photographed jacket indicates another version.
6. Prefer official artist/label/store images for the library jacket. Never use the user's uploaded photo as the library jacket image.

## Confidence Gate

- Add a record only when the identity and edition are supported by both text/metadata and artwork comparison.
- If the evidence conflicts, the edition is ambiguous, or the jacket cannot be matched reliably, do not add it to the library.
- Save every unresolved record's source photos in `C:\Users\azmax\Desktop\Undetectable Records` using sequential filenames in upload order.

## Grouping

Photo groups supplied with hyphens are one record. For example, `1-2, 3, 4-5` means three records: photos 1+2, photo 3, and photos 4+5.

## Output

For each confirmed record, retain the source photo numbers, artist, title, year, format, exact-edition note, confidence, and the official/reference jacket image URL. For unresolved records, retain the reason and saved filenames.
