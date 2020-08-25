window.Module = window.Module || {};

window.Module._runtimeInitialized = new Promise(
  f => (window.Module.onRuntimeInitialized = f)
);

const IMAGES = {};
const ONE_MB = 1000 * 1000;

let x2tInitialized = false;

window.APP = {
  getImageURL: (url, callback) => {
    if (url in IMAGES) {
      const buffer = IMAGES[url];
      const type = imageToMime(buffer);
      callback(URL.createObjectURL(new Blob([buffer], { type })));
    } else {
      callback(url);
    }
  },
  AddImage: function(success, error) {
    const exts = [ '.png', '.jpg', '.jpeg' ];
    const types = [ 'image/png', 'image/jpeg' ]; 
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', [ ...exts, ...types ].join(','));
    input.addEventListener('change', e => {
      if (e.target.files.length) {
        const [ file ] = e.target.files;
        file.arrayBuffer().then(buffer => {
          if (buffer.byteLength < ONE_MB){
            const name = Math.random().toString(36).slice(2, 12).padEnd(10, '0');
            IMAGES[name] = buffer;
            APP.getImageURL(name, url => {
              success({ name, url });
            });
          }else{
            alert("Maximum image size (1MB) exceed");
            error("Maximum image size (1MB) exceed");
          }
        });
      }
    });
    input.click();
  }
}

const mimeToType = type => {
  switch (type) {
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'xlsx';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'pptx';
    default:
      return "txt";
  }
}

const imageToMime = buffer => {
  // PNG file should begin with 89 50 4E 47 0D 0A 1A 0A
  // JPEG files begin with FFD8 and end with FFD9
  if (buffer.byteLength) {
    const header = new Uint8Array(buffer)[0].toString(16);
    if (header == '89') {
      return 'image/png';
    } else if (header == 'ff'){
      return 'image/jpeg';
    }
  }
  return 'text/plain';
}

document.addEventListener('DOMContentLoaded', function () {
  return;
  let interval = setInterval(function () {
    let hedset = document.querySelector('.hedset');      
    let boxTabs = document.querySelector('.box-tabs');
    let hamburger = document.querySelector('#slot-btn-options');
    let toolbar = document.querySelector('#toolbar');
    let content = toolbar && toolbar.nextElementSibling;
    if (hedset && boxTabs && hamburger && content && content.style.top) {
      clearInterval(interval);
      toolbar.style.top = 0;
      content.style.top = '95px';
      content.style.height = parseInt(content.style.height) + 95 + 'px'; 
      hedset.parentNode.parentNode.parentNode.removeChild(hedset.parentNode.parentNode);
      hedset.classList.add('extra', 'left');
      boxTabs.insertBefore(hedset, boxTabs.lastElementChild);
      hedset.appendChild(hamburger);
      document.body.style.opacity = '1';
    }
  }, 100);
}) 

const b64Decode = b64 => {
  const chars = atob(b64);
  const array = new Uint8Array(new ArrayBuffer(chars.length));
  for (let i = 0; i < chars.length; i++) {
    array[i] = chars.charCodeAt(i);
  }
  return array;
}

window.addEventListener('message', (() =>  {
  let type = 'txt';
  return msg => {
    if (msg.source !== parent) { return; }
    if (msg.data && msg.data.startsWith('data:')) {
      let { data } = msg;
      try {
        let pattern = /^data:([^;]+);base64,([0-9A-z\/+=]+)$/;
        let [ , mime, base ] = data.match(pattern) || [];
        let file = b64Decode(base);
        type = mimeToType(mime);
        importOOXMLFile(file, { name: 'document.' + type }, type, content => {
          var blob = new Blob([content], { type: mime });
          var url = URL.createObjectURL(blob);
          msg.source.postMessage(url, '*');
        });
      } catch (e) {
        console.log(e)
      }
      return;
    } else if (msg.data && msg.data.startsWith('DOCY;')) {
      try {
        const mime = 'text/plain';
        var blob = new Blob([msg.data], { type: mime });
        var url = URL.createObjectURL(blob);
        msg.source.postMessage(url, '*');
      } catch (e) {
        console.log(e);
      }
    } else if (msg.data && msg.data.startsWith('{')) {
      let obj = {};
      try {
        obj = JSON.parse(msg.data); 
      } catch (e) {
        console.log(e);
      }
      if (obj._do == "save") {
        let text = (window.editor || window.editorCell).asc_nativeGetFile();
        exportOOXMLFile(type, text, ([ blob ]) => {
          var reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = function () {
            msg.source.postMessage("save:" + reader.result, '*');
          };
        });
      }
    }
  }
})());

  function x2tConvertData(x2t, data, filename, extension, callback) {
    var convertedContent;
    // Convert from ODF format:
    // first convert to Office format then to the selected extension
    if (filename.endsWith(".ods")) {
      convertedContent = x2tConvertDataInternal(
        x2t,
        new Uint8Array(data),
        filename,
        "xlsx"
      );
      convertedContent = x2tConvertDataInternal(
        x2t,
        convertedContent,
        filename + ".xlsx",
        extension
      );
    } else if (filename.endsWith(".odt")) {
      convertedContent = x2tConvertDataInternal(
        x2t,
        new Uint8Array(data),
        filename,
        "docx"
      );
      convertedContent = x2tConvertDataInternal(
        x2t,
        convertedContent,
        filename + ".docx",
        extension
      );
    } else if (filename.endsWith(".odp")) {
      convertedContent = x2tConvertDataInternal(
        x2t,
        new Uint8Array(data),
        filename,
        "pptx"
      );
      convertedContent = x2tConvertDataInternal(
        x2t,
        convertedContent,
        filename + ".pptx",
        extension
      );
    } else {
      convertedContent = x2tConvertDataInternal(
        x2t,
        new Uint8Array(data),
        filename,
        extension
      );
    }
    //callback(convertedContent);
    x2tImportImages(x2t, function() {
      callback(convertedContent);
    });
  }

  function x2tInit(x2t) {
    x2t.FS.mkdir("/working");
    x2t.FS.mkdir("/working/media");
    x2tInitialized = true;
  }

  function x2tConvertDataInternal(
    x2t,
    data,
    fileName,
    outputFormat,
    urls = []
  ) {
    //debug("Converting Data for " + fileName + " to " + outputFormat);
    // writing file to mounted working disk (in memory)
    x2t.FS.writeFile("/working/" + fileName, data);


    for (const [ name, url ] of urls) {
      x2t.FS.writeFile(
        "/working/media/" + name,
        new Uint8Array(IMAGES[name])
      );
    }
    ////if (window.frames.length) {
    //if (urls.length) {
    //  // Adding images
    //  //Object.keys(window.frames[0].AscCommon.g_oDocumentUrls.urls || {}).forEach(function (_mediaFileName) {
    //  urls.forEach(function(_mediaFileName) {
    //    var mediaFileName = _mediaFileName.substring(6);
    //    var mediasSources = getMediasSources();
    //    var mediaSource = mediasSources[mediaFileName];
    //    var mediaData = mediaSource ? mediasData[mediaSource.src] : undefined;
    //    if (mediaData) {
    //      //debug("Writing media data " + mediaFileName);
    //      //debug("Data");
    //      var fileData = mediaData.content;
    //      x2t.FS.writeFile(
    //        "/working/media/" + mediaFileName,
    //        new Uint8Array(fileData)
    //      );
    //    } else {
    //      //debug("Could not find media content for " + mediaFileName);
    //    }
    //  });
    //}

    var params =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<TaskQueueDataConvert xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">' +
      "<m_sFileFrom>/working/" +
      fileName +
      "</m_sFileFrom>" +
      "<m_sFileTo>/working/" +
      fileName +
      "." +
      outputFormat +
      "</m_sFileTo>" +
      "<m_bIsNoBase64>false</m_bIsNoBase64>" +
      "</TaskQueueDataConvert>";
    // writing params file to mounted working disk (in memory)
    x2t.FS.writeFile("/working/params.xml", params);
    // running conversion
    x2t.ccall("runX2T", ["number"], ["string"], ["/working/params.xml"]);
    // reading output file from working disk (in memory)
    var result;
    try {
      result = x2t.FS.readFile("/working/" + fileName + "." + outputFormat);
    } catch (e) {
      console.log("Failed reading converted file");
      alert("Failed reading converted file");
      // debug("Failed reading converted file");
      // UI.removeModals();
      // UI.warn(Messages.error);
      return "";
    }
    return result;
  }

  function x2tSaveAndConvertDataInternal(
    x2t,
    data,
    filename,
    extension,
    finalFilename
  ) {
    //var type = 'sheet';//TYPE; //'sheet';//common.getMetadataMgr().getPrivateData().ooType;
    //var xlsData;
    //if (type === "sheet" && extension !== "xlsx") {
    //  xlsData = x2tConvertDataInternal(x2t, data, filename, "xlsx");
    //  filename += ".xlsx";
    //} else if (type === "ooslide" && extension !== "pptx") {
    //  xlsData = x2tConvertDataInternal(x2t, data, filename, "pptx");
    //  filename += ".pptx";
    //} else if (type === "oodoc" && extension !== "docx") {
    //  xlsData = x2tConvertDataInternal(x2t, data, filename, "docx");
    //  filename += ".docx";
    //}
    const urls = Object.entries(window.AscCommon.g_oDocumentUrls.urls)
      .filter(([ name ]) => name.startsWith('media/'))
      .map(([ name, url ]) => [ name.slice(6), url ]);
    let xlsData = x2tConvertDataInternal(x2t, data, filename, extension, urls);
    if (xlsData) {
      var blob = new Blob([xlsData], { type: "application/bin;charset=utf-8" });
      //UI.removeModals();
      //saveAs(blob, finalFilename);
      return [blob, finalFilename];
    }
  }

  function x2tSaveAndConvertData(
    data,
    filename,
    extension,
    finalFilename,
    callback
  ) {
    // Perform the x2t conversion
    //require(['/common/onlyoffice/x2t/x2t.js'], function() {
    var x2t = window.Module;
    x2t.run();
    //if (x2tInitialized) {
    //    //debug("x2t runtime already initialized");
    //    x2tSaveAndConvertDataInternal(x2t, data, filename, extension, finalFilename);
    //}

    x2t._runtimeInitialized.then(() => {
      if (!x2tInitialized) {
        x2tInit(x2t);
      }
      let result = x2tSaveAndConvertDataInternal(
        x2t,
        data,
        filename,
        extension,
        finalFilename
      );
      callback(result);
    });
    ////x2t.onRuntimeInitialized = function() {
    //    //debug("x2t in runtime initialized");
    //    // Init x2t js module
    //    x2tInit(x2t);
    //    x2tSaveAndConvertDataInternal(x2t, data, filename, extension, finalFilename);
    ////};
    //});
  }

  function exportOOXMLFile(type, text, callback) {
    //var text = content;// || getContent();
    //var suggestion = "some document"; ///Title.suggestTitle(Title.defaultTitle);
    //var ext = [".xlsx", /*'.ods',*/ ".bin"];
    //var type = 'sheet';//TYPE; //'sheet';;//common.getMetadataMgr().getPrivateData().ooType;
    //var warning = "";
    //if (type === "ooslide") {
    //  ext = [".pptx", /*'.odp',*/ ".bin"];
    //} else if (type === "oodoc") {
    //  ext = [".docx", /*'.odt',*/ ".bin"];
    //}

    //if (typeof Atomics === "undefined") {
    //  ext = [".bin"];
    //  warning =
    //    '<div class="alert alert-info cp-alert-top">' +
    //    Messages.oo_exportChrome +
    //    "</div>";
    //}

    //let filename = "document";
    //ext = ext[0].replace(/^\./, "");

    //setTimeout(function () {
    x2tSaveAndConvertData(
      text,
      "document.bin",
      type,
      "document." + type,
      callback
    );
    //}, 100);
    return;

    //var types = ext.map(function (val) {
    //    return {
    //        tag: 'a',
    //        attributes: {
    //            'data-value': val,
    //            href: '#'
    //        },
    //        content: val
    //    };
    //});
    //var dropdownConfig = {
    //    text: ext[0], // Button initial text
    //    caretDown: true,
    //    options: types, // Entries displayed in the menu
    //    isSelect: true,
    //    initialValue: ext[0],
    //    common: common
    //};
    //var $select = UIElements.createDropdown(dropdownConfig);

    //UI.prompt(Messages.exportPrompt+warning, Util.fixFileName(suggestion), function (filename) {
    //    // $select.getValue()
    //    if (!(typeof(filename) === 'string' && filename)) { return; }
    //    var ext = ($select.getValue() || '').slice(1);
    //    if (ext === 'bin') {
    //        var blob = new Blob([text], {type: "application/bin;charset=utf-8"});
    //        saveAs(blob, filename+'.bin');
    //        return;
    //    }

    //    var content = h('div.cp-oo-x2tXls', [
    //        h('span.fa.fa-spin.fa-spinner'),
    //        h('span', Messages.oo_exportInProgress)
    //    ]);
    //    UI.openCustomModal(UI.dialog.customModal(content, {buttons: []}));

    //    //setTimeout(function () {
    //        x2tSaveAndConvertData(text, "filename.bin", ext, filename+'.'+ext);
    //    //}, 100);
    //}, {
    //    typeInput: $select[0]
    //}, true);
  }

  function importOOXMLFile(content, filename, ext, callback) {
    if (ext === "bin") {
      return void importFile(content);
    }
    if (typeof Atomics === "undefined") {
      alert("no support");
      return;
    }
    //setTimeout(function() {
      var x2t = window.Module;
      x2t.run();
      x2t._runtimeInitialized.then(() => {
        if (!x2tInitialized) {
          x2tInit(x2t);
        }
        x2tConvertData(
          x2t,
          new Uint8Array(content),
          filename.name,
          "bin",
          callback
          //function(convertedContent) {
          //  importFile(convertedContent);
          //}
        );
      });
    //}, 100);
  }

  function x2tImportImagesInternal(x2t, images, i, callback) {
    if (i >= images.length) {
      callback();
    } else {
      var path = "/working/media/" + images[i];
      var data = x2t.FS.readFile("/working/media/" + images[i], {
        encoding: "binary"
      });
      IMAGES[images[i]] = data.buffer;
      //const file = new Blob([data.buffer], { type: "image/png" });
      //file.name = images[i];
      //IMAGES[file.name] = file;
      //var reader = new FileReader();
      //reader.onload = event => {
      //    IMAGES[file.name] = event.target.result;
      //    x2tImportImagesInternal(x2t, images, i + 1, callback);
      //};
      //fileReader.readAsArrayBuffer(blob);
      x2tImportImagesInternal(x2t, images, i + 1, callback);

      //var reader = new FileReader();
      //reader.onload = function(e) {
      //  IMAGES[blob.name] = reader.result;
      //  x2tImportImagesInternal(x2t, images, i + 1, callback);
      //}
      //reader.readAsDataURL(blob);

      ////APP.FMImages.handleFile(blob, handleFileData);
    }
  }

  function x2tImportImages(x2t, callback) {
    //if (!APP.FMImages) {
    //  var fmConfigImages = {
    //    noHandlers: true,
    //    noStore: true,
    //    body: document.body, //$('body'),
    //    onUploaded: function(ev, data) {
    //      if (!ev.callback) {
    //        return;
    //      }
    //      //debug("Image uploaded at " + data.url);
    //      var parsed = Hash.parsePadUrl(data.url);
    //      if (parsed.type === "file") {
    //        var secret = Hash.getSecrets("file", parsed.hash, data.password);
    //        var fileHost = privateData.fileHost || privateData.origin;
    //        var src = fileHost + Hash.getBlobPathFromHex(secret.channel);
    //        var key = Hash.encodeBase64(secret.keys.cryptKey);
    //        //debug("Final src: " + src);
    //        ev.mediasSources[ev.name] = { name: ev.name, src: src, key: key };
    //      }
    //      ev.callback();
    //    }
    //  };
    //  //APP.FMImages = common.createFileManager(fmConfigImages);
    //}

    // Import Images
    //debug("Import Images");
    var files = x2t.FS.readdir("/working/media/");
    var images = [];
    files.forEach(function(file) {
      if (file !== "." && file !== "..") {
        images.push(file);
      }
    });
    //console.log('IMAGES', images);
    //callback();
    x2tImportImagesInternal(x2t, images, 0, function() {
      //debug("Sync media sources elements");
      //debug(getMediasSources());
      //APP.onLocal();
      //debug("Import Images finalized");
      callback();
    });
  }
