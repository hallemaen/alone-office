# Alone Office - Standalone, client-side and browser-based docs, slides and sheets.

./gen.sh localhost

* trust generated certificate *

node server

# notes
common/onlyoffice/v2a/sdkjs/word/sdk-all.js
:%s/window.parent.APP.getImageURL/window.APP.getImageURL/

add window.dontLoadSdkAll = true or something like that and load it yourself with sri
