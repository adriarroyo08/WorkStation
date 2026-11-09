Verificación local de #152 (9 de noviembre de 2026, Windows, JDK 17).

- `npm run check`: correcto, 48 ficheros y 641 tests.
- `gradlew.bat -p android --no-daemon :phone:assembleRelease :wear:assembleRelease`: correcto, con una clave temporal generada localmente.
- Mismo comando con `GITHUB_EVENT_NAME=pull_request` y `GITHUB_REF=refs/pull/152/merge`, sin secrets: correcto.
- `gradlew.bat -p android --no-daemon help`, con `GITHUB_EVENT_NAME=push` y `GITHUB_REF=refs/heads/main`, sin secrets: rechazo esperado con «Falta el secret de firma WS_KEYSTORE_PASSWORD».
- `apksigner verify --print-certs` sobre ambos APK: válido y mismo certificado temporal SHA-256 `a2c66a0b73183aace7389ae4f702f6343b524ee30ee3de089e24720a752a752f`.

[Captura del informe de logs reales](verificacion.png). Es evidencia de compilación y validación de firma, no una captura de la interfaz ni una prueba de instalación. No cambia la interfaz.

La clave y los valores de los secrets de producción no se han consultado. Se conserva la ruta de decodificación del keystore y se siguen pasando las mismas credenciales explícitas a ambos módulos; la comprobación de una publicación con la firma real requiere el entorno de GitHub Actions con esos secrets.
