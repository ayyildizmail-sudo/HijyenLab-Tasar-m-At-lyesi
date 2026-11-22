# HijyenLab Tasarım Atölyesi — Sürüm ve Dal Haritası

Son güncelleme: 22.11.2026

## Depodaki dallar

| Dal | İçerik | Durum |
|---|---|---|
| `main` | V1–V89 tam git geçmişi. Ucu V89 = `f81488373f7d2ecc48462a15952bc6bbc8472ba8` | Doğrulanmış son yayın (04.11.2026). Kaynak TAR ile birebir aynı. |
| `v91-calisma-paketi` | `main` + 6 commit (özgün son commit `03eb565`, yeniden uygulandığı için hash farklı) + 05.11 paketindeki commit edilmemiş değişiklikler | Yayınlanmamış çalışma paketi |
| `canli-onyuz-kurtarma` | `v91-calisma-paketi` + canlı siteden özet doğrulamasıyla indirilen 125 ön yüz dosyası (22.11.2026) | Canlıdaki en güncel ön yüz. Sunucu kodu V91'den. V95 ile eşleşmesi kanıtlanmadı. |
| `claude/hijyenlab-tasarim-atolyesi-0x1tr1` | Devir ve denetim raporları (`docs/`) | Rapor dalı |

Bilinen ama elde olmayan sürümler:
- V94: `900dea6`
- V95: `130f530` (09.11.2026)

Bu iki sürümün kaynağı yok (bkz. `docs/TEKNIK_DEVIR_RAPORU.md`, C ve D.1).

## Yayınlanmış sürümler → commit

Kaynak: 04.11.2026 devir paketindeki `sites_versions.json` ve `sites_versions_older.json`. Commit'lerin hepsi `main` geçmişinde mevcut. Bu oturumun Git erişimi etiket göndermeye izin vermediği için liste etiket yerine burada tutuluyor. Yerelde etiket oluşturmak için: `git tag yayin-vNN <commit>`.

"Yayın kimliği yok" işaretli sürümler kayıtta oluşturulmuş ama canlıya alınmamış görünüyor.

| Sürüm | Commit | Not |
|---|---|---|
| V89 | `f81488373f7d2ecc48462a15952bc6bbc8472ba8` |  |
| V88 | `6c3c835af4ce884763e640c37cf277d9e7b97168` |  |
| V87 | `c31c0db5515e1b2729889770d2ad400b5cd8f426` |  |
| V86 | `9b1e82c28adca90230d89939f419fd132fd57e5a` |  |
| V85 | `18a1f9ed8cb079856ebc4cd2ce81863b290fc881` |  |
| V84 | `66585ecdde24139d80d47219e578a85083fb7d57` |  |
| V83 | `bd32e0297a93bcee3e605a7cf462a576e60885cd` |  |
| V82 | `f80b46b975247327463be2dfa1cb4afbf41f4075` |  |
| V81 | `1ef536a18452b2543788e498ff33cc00a8a6de64` |  |
| V80 | `c3af8338a06c3c7e326a9a32c16846dacc1b0259` |  |
| V79 | `7970a186448b89a9f6d864534f88fd700b02bd94` |  |
| V78 | `e48b52f64b8f759aba7b2b7da9bb53c73ec8fb77` |  |
| V77 | `a24e8d21a4a94232ab32aaa566e8019dac56cdd7` |  |
| V76 | `3e8133a681fd1d6992ac4a43c68eff50c00a859a` |  |
| V75 | `0019d06daa838ff587bed4cd340c79ad8c4b1c8a` |  |
| V74 | `e13ac026a8515c908028aae3945628ab21c9548d` |  |
| V73 | `b8bcfc56545229caa0439069f1f3a026227bb89a` |  |
| V72 | `4e34fffb56744df833be183ebdfaa64c674db70d` |  |
| V71 | `11d39d92cd0ce8fcfb5db997886114b321826306` |  |
| V70 | `2b2255d3c007e3f14b0be41ef8625399d9c9c5c1` |  |
| V69 | `55c9d81b420a02942a1290e46b5cc3d3712e31b2` |  |
| V68 | `64ada5879810f24fe5154982df687da939941511` |  |
| V67 | `00c4cd52199c228126829b69d1fb774de950c049` |  |
| V66 | `cb080088cef8f543fdd6d17ef036bf0ccb3a4af4` | yayın kimliği yok |
| V65 | `5ab2385425342cde093970122e4afca1919990fe` |  |
| V64 | `426901416149c605167891909928826ecb9265ba` |  |
| V63 | `83af949cbcc75b39d068fbace3902407cba8b9cb` | yayın kimliği yok |
| V62 | `afbd263c429afa5e9a4eea983dfa1513bfa66bba` |  |
| V61 | `b4d077bb96e200d852ae6c78827ac5391d66568d` |  |
| V60 | `bfaa7a96ff02a473f6a90b217fb64cfbee2ac5be` |  |
| V59 | `db279ef5ea3c36672e1a3ace1773b29ca3be13c3` |  |
| V58 | `8238fa51545dddc79124f3721548655b893a6130` |  |
| V57 | `c82109bb933910fc76e060525c7c5b057a0b155e` |  |
| V56 | `a536b303f0749c6b899afd80d2be43c1a22b8d16` |  |
| V55 | `9b36ca6e130fca15e8300b1d24bc771a8f8c4a8d` |  |
| V54 | `a3f160dc244f8c0865eaf1ce747d69bed7a21c98` |  |
| V53 | `eea2654134f99cce7c8c80b2db0b1214db9794d5` |  |
| V52 | `b451d24941ff6f19244343a3b1f0ee3132f74070` |  |
| V51 | `c61e92e7c9ad8990f43a3320e4fcd580bca33c42` | yayın kimliği yok |
| V50 | `f76c9fb6fd367615702719ee4e6be14666ec085b` |  |
| V49 | `3a92cfe8046e456da744d691ea09a83cfe92ceea` |  |
| V48 | `d5f6b387a70a0918e9011bc23b18efa05f00722f` |  |
| V47 | `8efc6959d6d1ba14cb9284aed88b59608e0725ab` |  |
| V46 | `7f03e34045eff77b5acffe7c082adeda27470dee` |  |
| V45 | `a4b482805e5007ff147e371a8e9e31af00bd6f7e` |  |
| V44 | `3225275f846977bd0d25683c58a0cf8f0a358bff` |  |
| V43 | `c41e964e111e330be290d6d74b9c89779cba1ad3` | yayın kimliği yok |
| V42 | `cb3f789b3aa24f3854c5b96e37ec93a864d80804` |  |
| V41 | `d181ddbaf09e12c322a6802a85a3bcbb3673c269` |  |
| V40 | `d10c2361fab76494b5db9dbfd053a001537cc6c9` |  |
| V39 | `b14f8ebcdc78a578dfcbf1687b6b8a0a29115e11` |  |
| V38 | `c72a303fafc2c2fadf2ceea13522a124f0db7a2e` |  |
| V37 | `02235d751ecddc7a2395845aa1c96e7d0a86e160` |  |
| V36 | `4b0245c65a4e7b9873122cd31812a8a7bb995e4e` |  |
| V35 | `50b839e6131172990f2d48b82df5a2bab6eb4508` |  |
| V34 | `8666a3ab9c9e6ecff62e6a66c53f393082e0f69c` |  |
| V33 | `9a29c97d95efb141f7b1eddece2bf5e04f7cfb84` |  |
| V32 | `9cb3ab231f001a7191147fd786867154bd357266` |  |
| V31 | `d0be0bf7827ab3c0a46a6108a608f619bed24a2d` |  |
| V30 | `98d3632bd505851fe0a5e14ef407cd21f06b1ea4` |  |
| V29 | `f8f44fd06f1da85b7ad9f47610f4eb86b9c74255` |  |
| V28 | `70266e3b0f85cca481132a27be6a1e46333f18c5` |  |
| V27 | `189608af427ad61bf95bda3d6556b0ba9392c95b` | yayın kimliği yok |
| V26 | `41042905d41f4bced7435bfc99dd86c75e19bb00` | yayın kimliği yok |
| V25 | `febba0506a8eb5e051bc5580af3672bd890755d1` | yayın kimliği yok |
| V24 | `e0c50295459e426c6062b37c2ce9ee017b79c4e3` |  |
| V23 | `bfd804a8920d014c85ba1b49ea464929ed0ec77d` |  |
| V22 | `baf1d70fd73d363f340af5c94cb9cdc381890475` |  |
| V21 | `ade48faef10e2edcd67125cd06a6bd0e00e13928` |  |
| V20 | `895818118886f15aa39b6b33013072cb5a54a25d` |  |
| V19 | `0b1c6907221db66222b717ec4d96d2761b504af0` |  |
| V18 | `1b1c6618bb0e7d88eb04149baa5e9ff561f13a3e` |  |
| V17 | `1371d516f1f06f10d1159f300177ba3f2a5779ce` |  |
| V16 | `aa5bcab834723528efbb210da7ec9f6aad95fa8d` |  |
| V15 | `216f7be0a8d5b9b7e6b843bb9d7794c54c8b407b` |  |
| V14 | `8092ae7ce1d9b6b119bd26bf77c2c43a8fe3f25c` |  |
| V13 | `15b79b3540725f76f68ccb55d52359cdc03c9258` |  |
| V12 | `2fecfd803a59cd23c349ed013a1a79712233aec1` |  |
| V11 | `764f0846129cce62371c9650a17a6c8f31dcbcdc` |  |
| V10 | `f6d3cf7eae6b21a359cc21450a3ee450ac248a0b` |  |
| V9 | `427514be8cd4587595c00dc2373bddf899e2f779` |  |
| V8 | `2964a177c0e3fa162566db678fed8e49ba3d1b75` |  |
| V7 | `781018e90423fd78d8c6f7871de8fd1c7d21e0b2` |  |
| V6 | `58e4c2510be2d58267c4880bf7fa9fca9ad6a27e` |  |
| V5 | `31806a5e2ff27f9c8d100312e9d6d89636395042` |  |
| V4 | `ff5aa6f33c720bebaefb438046957f998026b716` |  |
| V3 | `80a928feb1a26c5ab3d34452dce581502c7ccdca` |  |
| V2 | `e54b15e3ffeef4e5d45f07fb81daeeb9f545bc7f` |  |
| V1 | `368d5d9b782bd0f6ae7048a20b9c2bad716d7c92` |  |
