# V48 — photo proposal geometry route

V47 corrected extracted composite screenshots only. The user's next screenshot showed the direct photograph comparison panel, which bypassed that correction. V48 normalizes every white-carrier photo proposal after extraction and before the comparison panel receives the file. Rear photo extraction runs the same alpha-safe geometry stage after its route-specific deskew. Clean native logo uploads are unchanged.

The original napkin photograph is a private test fixture. No clean-logo lookup, brand-specific coordinates or spelling rules are used. Whole-source affine resampling preserves transparency and premultiplied color. This is evidence-gated frame shear rectification, not universal perspective reconstruction or an original print master.

Verification: 147 aggregate Node tests passed, TypeScript passed. Original photograph, resized and rotated cases, synthetic partial-alpha cases, legacy early return routing, rear route and repeated application are covered. The photo regression suite and fixture are mandatory release gate inputs. Browser QA uploaded the original photograph, inspected the corrected comparison image, accepted it and visually inspected the mockup. No native iPhone execution was performed.
