# Android signing key (read before the first Play upload)

**The upload key made by the old "Android upload key (one time)" workflow on 2026-11-01 is treated as burned.** That workflow
published the key and its password as a downloadable artifact in a public repository for one day. The app has not been uploaded to
Google Play, so nothing is lost: make a new key, and replace the four repository secrets the Android build reads
(`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and the key password if it differs). The workflow has been deleted so this cannot happen again.

## Make a new upload key (on your own computer, never in CI)
```sh
keytool -genkeypair -v -keystore upload.jks -alias socallights -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=SoCal Lights, O=Forza-TEK, C=US"
```
Choose a long password when asked and store the file and password in a password manager (two copies; losing it means asking Google to reset the upload key).
Then:
```sh
base64 -w0 upload.jks            # on a Mac: base64 -i upload.jks
```
Put the output in the GitHub repository secret `ANDROID_KEYSTORE_B64`, the password in `ANDROID_KEYSTORE_PASSWORD`, and `socallights` in `ANDROID_KEY_ALIAS`
(GitHub, Settings, Secrets and variables, Actions). Never commit `upload.jks`, and never upload it as a workflow artifact.

## Play Console
Use **Play App Signing** (Google holds the real signing key; the upload key above can be reset by Google if it is ever lost or exposed).
Check the app's signing setting when you create the app listing.
