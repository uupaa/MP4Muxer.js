var ModuleTestMP4Muxer = (function(global) {

var test = new Test(["MP4Muxer"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     false,  // enable worker test.
        node:       false,  // enable node test.
        nw:         true,  // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     false,  // show button.
        both:       false,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
            console.error(error.message);
        }
    });

if (IN_BROWSER || IN_NW || IN_EL) {
    test.add([
        testMP4Muxer,
        //testMP4Muxer_test_ts_30sec_mpeg4,
    ]);
}

// --- test cases ------------------------------------------
function testMP4Muxer(test, pass, miss) {
    // TestD:
    //  MPEG2TS.parse("ff/png.all.mp4.00.ts") -> MP4Muxer.mux() -> MP4Builder.build() の結果が
    //  ff/png.all.mp4.00.ts.mp4 と同じになることを確認する

    var sourceFile = "../assets/ff/png.all.mp4.00.ts";
    var resultFile = "../assets/js/png.all.mp4.00.ts.mp4";
    var verifyFile = "../assets/ff/png.all.mp4.00.ts.mp4";

    FileLoader.toArrayBuffer(sourceFile, function(buffer) {
        console.log("testMP4Muxer: ", sourceFile, buffer.byteLength);

        MPEG2TS.VERBOSE = false;
        MPEG2TSParser.VERBOSE = false;
        MPEG4ByteStream.VERBOSE = false;
debugger;

        var mpeg2ts         = MPEG2TS.parse( new Uint8Array(buffer) );

        var videoByteStream = MPEG2TS.convertTSPacketToByteStream( mpeg2ts["VIDEO_TS_PACKET"] );
        var videoNALUnit    = MPEG4ByteStream.convertByteStreamToNALUnitObjectArray( videoByteStream );
        var mp4tree         = MP4Muxer.mux( videoNALUnit );

        console.dir(mp4tree);
/*
//        HexDump(mp4box.root.mdat.data);

        var mp4file         = MP4Builder.build(mp4box);

        console.log("LOAD FROM: ", sourceFile, buffer.byteLength);

        ///console.dir(mpeg2ts);
        console.dir(mp4box);
global.mp4box = mp4box;

        fs.writeFileSync(resultFile, new Buffer(mp4file.buffer), "binary"); // Finder で確認
        console.log("WRITE TO: ", resultFile, mp4file.length);

        FileLoader.toArrayBuffer(verifyFile, function(buffer) {
            var ffmpeg = new Uint8Array(buffer);
            var jsmpeg = new Uint8Array(mp4file.buffer);

            console.log("LOAD VERIFY FILE: ", verifyFile, buffer.byteLength);

            if ( _binaryCompare(ffmpeg, jsmpeg) ) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });
 */
    }, function(error) {
        console.error(error.message);
    });

/*
 * AUD -> SPS(ID = 0) -> PPS(ID = 0) -> SEI -> IDR(ID = 0)
 *
 * AUD -> SPS(ID = 0!) -> PPS(ID = 0!) -> IDR(ID = 1)
 *
 * AUD -> SPS(ID = 0!) -> PPS(ID = 0!) -> IDR(ID = 0!)
 *
 * AUD -> SPS(ID = 0!) -> PPS(ID = 0!) -> IDR(ID = 1!)
 *
 * AUD -> SPS(ID = 0!) -> PPS(ID = 0!) -> IDR(ID = 0!)
 */
}

function testMP4Muxer_test_ts_30sec_mpeg4(test, pass, miss) {
    // TestD:
    //  MPEG2TS.parse("ff/30sec_png.all.mp4.00.ts") -> MP4.mux() -> MP4.build() の結果が
    //  ff/30sec_png.all.mp4.00.ts.mp4 と同じになることを確認する

    var fs = require("fs");
    var sourceFile = "../assets/ff/30sec_png.all.mp4.00.ts";
    var resultFile = "../assets/js/30sec_png.all.mp4.00.ts.mp4";
    var verifyFile = "../assets/ff/30sec_png.all.mp4.00.ts.mp4";
    var PERF = true;

    FileLoader.toArrayBuffer(sourceFile, function(buffer) {
        console.log("LOAD FROM: ", sourceFile, buffer.byteLength);

        if (PERF) { var time = performance.now(); }

        var mpeg2ts                 = MPEG2TS.parse(new Uint8Array(buffer));
        var videoPESPacket          = MPEG2TS.toPESPacket(mpeg2ts["VIDEO_TS_PACKET"]);
        var videoByteStream         = MPEG2TS.toByteStream(videoPESPacket);
      //var videoNALUnitArray       = ByteStream.toNALUnit(videoByteStream);        // ByteStream -> NALUnitArray
        var videoNALUnitArray       = NALUnit.convertByteStreamToNALUnit(videoByteStream);        // ByteStream -> NALUnitArray
        var videoNALUnitObjectArray = NALUnit.convertNALUnitToNALUnitObjectArray(videoNALUnitArray);   // NALUnitArray -> NALUnitObjectArray
                                                                                                  // MP4Muxer.mux(NALUnitObjectArray) -> MP4BoxTreeObject
        // videoNALUnitObjectArray がわかりづらい??? 

     // var audioPESPacket  = AVC.MPEG2TSPacket.toPESPacket(mpeg2ts["AUDIO_TS_PACKET"]);
     // var audioByteStream = AVC.MPEG2PESPacket.toByteStream(audioPESPacket);
     // var audioNALUnit    = AVC.ByteStream.toNALUnit(audioByteStream);

        var mp4tree          = MP4Muxer.mux(videoNALUnitObjectArray);

//        HexDump(mp4tree.root.mdat.data);
//        console.dir(mp4tree);

        var mp4file         = MP4Builder.build(mp4tree);

        console.log("LOAD FROM: ", sourceFile, buffer.byteLength);
        if (PERF) { console.info("cost: " + (performance.now() - time)); }

        ///console.dir(mpeg2ts);
        console.dir(mp4tree);
global.mp4tree = mp4tree;

        fs.writeFileSync(resultFile, new Buffer(mp4file.buffer), "binary"); // Finder で確認
        console.log("WRITE TO: ", resultFile, mp4file.length);

        FileLoader.toArrayBuffer(verifyFile, function(buffer) {
            var ffmpeg = new Uint8Array(buffer);
            var jsmpeg = new Uint8Array(mp4file.buffer);

            console.log("LOAD VERIFY FILE: ", verifyFile, buffer.byteLength);

            var mp4box2 = MP4Parser.parse(new Uint8Array(buffer));

            console.group(verifyFile);
            console.dir(mp4box2);
            console.groupEnd();


            if ( _binaryCompare(ffmpeg, jsmpeg) ) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });
    }, function(error) {
        console.error(error.message);
    });
}

return test.run();

})(GLOBAL);

