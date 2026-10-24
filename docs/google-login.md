# Iniciar sesión con Google: pasos manuales

El código ya está en la app. Para que funcione hay que configurar Google Cloud, Supabase y GitHub. Sin la variable `VITE_GOOGLE_WEB_CLIENT_ID` el botón "Continuar con Google" no aparece y todo sigue igual.

## 1. SHA-1 de la clave de firma real

Android solo acepta el inicio de sesión si el SHA-1 de la clave que firma el APK está registrado en Google Cloud.

**No uses `android/keystore/workstation.jks` del repo**: es una clave local de prueba, no la de las versiones publicadas. La real está en el secret de GitHub `WS_KEYSTORE_B64` (base64 del `.jks`; ver `.github/workflows/android.yml`).

1. Copia el valor del secret a un archivo (por ejemplo `ws.b64`; GitHub no deja leer secrets, usa tu copia original) y decodifícalo:
   ```
   base64 -d ws.b64 > release.jks
   ```
2. Lee la huella. El alias es el del secret `WS_KEY_ALIAS` (si no existe, CI usa `workstation`) y la contraseña la de `WS_KEYSTORE_PASSWORD` (por defecto `workstation`):
   ```
   keytool -list -v -keystore release.jks -alias <WS_KEY_ALIAS>
   ```
   Copia la línea `SHA1:`. Borra `release.jks` y `ws.b64` al terminar.
3. Si publicas en Google Play con "Play App Signing", Play re-firma el APK: en ese caso usa el SHA-1 de **Play Console → Configuración → Integridad de la aplicación → Clave de firma de la aplicación** (y registra también el de la clave de subida si instalas el APK sin pasar por Play).

SHA-1 de debug (builds `debug` desde Android Studio): `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`. Regístralo como un segundo cliente Android si quieres probar el login en builds de debug. Nota: en este proyecto `debug` también se firma con la clave `shared` (ver `build.gradle.kts`), así que depende de qué keystore tengas en `android/keystore/` en local.

## 2. Google Cloud (console.cloud.google.com)

En APIs y servicios → Credenciales (con la pantalla de consentimiento OAuth ya configurada):

1. **ID de cliente OAuth → Aplicación web.** Orígenes autorizados: `https://adriarroyo08.github.io` y `http://localhost:5173`. URI de redirección autorizada: `https://<ref-del-proyecto>.supabase.co/auth/v1/callback`. Anota el **ID de cliente** y el **secreto**.
2. **ID de cliente OAuth → Android**: nombre de paquete `com.workstation.app` y el SHA-1 del paso 1. Si usas debug, crea otro cliente Android con el mismo paquete y el SHA-1 de debug. Estos clientes no se usan en el código; solo hacen falta registrados.

## 3. Supabase (Dashboard del proyecto)

- **Authentication → Providers → Google**: activar; pegar el ID de cliente y el secreto del cliente **Web**. Deja "Skip nonce checks" desactivado (la app envía nonce) y añade el ID de cliente Web también en "Authorized Client IDs".
- **Authentication → URL Configuration**:
  - Site URL: `https://adriarroyo08.github.io/WorkStation/`
  - Redirect URLs: `https://adriarroyo08.github.io/WorkStation/`, `https://adriarroyo08.github.io/WorkStation/**` y `http://localhost:5173/**`.

## 4. Variable de GitHub

El ID de cliente **Web** (no el Android):

```
gh variable set VITE_GOOGLE_WEB_CLIENT_ID --body "<id>.apps.googleusercontent.com"
```

Los workflows `android.yml` y `pages.yml` la pasan al build. Para probarlo en local, ponla en `app/.env.local`.

Después, lanza de nuevo los dos workflows (APK y Pages).
