(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("MP4Muxer", function moduleClosure(global, WebModule, VERIFY, VERBOSE) {
"use strict";

// --- technical terms / data structure --------------------
/* Usage

    var mpeg2ts         = MPEG2TS.parse( new Uint8Array(buffer) );

    var videoByteStream = MPEG2TS.convertTSPacketToByteStream( mpeg2ts["VIDEO_TS_PACKET"] );
    var videoNALUnit    = MPEG4ByteStream.convertByteStreamToNALUnitObjectArray( videoByteStream );
    var mp4tree         = MP4Muxer.mux( videoNALUnit );

    var audioByteStream = MPEG2TS.convertTSPacketToByteStream( mpeg2ts["AUDIO_TS_PACKET"] );
    var audioNALUnit    = MPEG4ByteStream.convertByteStreamToNALUnitObjectArray( audioByteStream );


- AccessUnit
    - `{ mdatOffset, size, AUD, SPS, PPS, SEI, IDR }`

- DiagnosticInformationObject
    - `{ ... }`

```js
MP4BoxTreeObject = {
    root: {
        ftyp: {},
        moov: {
            mvhd: {},
            trak: {
                tkhd: {},
                edts: {
                    elst: {},
                },
                mdia: {
                    mdhd: {},
                    hdlr: {},
                    minf: {
                        vmhd: {},
                        dinf: {
                            dref: {},
                        },
                        stbl: {
                            stsd: {
                                avc1: {
                                    avcC: {},
                                },
                            },
                            stts: {},
                            stss: {},
                            stsc: {},
                            stsz: {},
                            stco: {},
                        },
                    },
                },
            },
            udta: {
                meta: {
                    hdlr: {},
                    ilst: {},
                },
            },
        },
        free: {},
        mdat: {},
    },
};
```


 */

// --- dependency modules ----------------------------------
var AUD = WebModule["NALUnitAUD"];
var SPS = WebModule["NALUnitSPS"];
var PPS = WebModule["NALUnitPPS"];
var SEI = WebModule["NALUnitSEI"];
var IDR = WebModule["NALUnitIDR"];
var NON_IDR = WebModule["NALUnitNON_IDR"];
var ParameterSet = WebModule["NALUnitParameterSet"];
var MP4Parser = WebModule["MP4Parser"];
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
var PROFILES = {
        0x42: "Baseline profile",
        0x4D: "Main profile",
        0x64: "High profile",
    };

var LEVELS = {
                     // | Lv  | PS3 | iPhone 5s | iPhone 4s | iPhone 3GS   |
                     // |-----|-----|-----------|-----------|--------------|
        0x0C: "1.2", // | 1.2 |     |           |           |              |
        0x0D: "1.3", // | 1.3 |     |           |           |              |
        0x14: "2.0", // | 2.0 | YES |           |           |              |
        0x15: "2.1", // | 2.1 | YES |           |           |              |
        0x16: "2.2", // | 2.2 | YES |           |           |              |
        0x1E: "3.0", // | 3.0 | YES | YES       |           | Baseline 3.0 |
        0x1F: "3.1", // | 3.1 | YES | YES       | Main 3.1  |              |
        0x20: "3.2", // | 3.2 | YES | YES       | Main 3.2  |              |
        0x28: "4.0", // | 4.0 | YES | YES       | Main 4.0  |              |
        0x29: "4.1", // | 4.1 | YES | YES       | Main 4.1  |              |
        0x2A: "4.2", // | 4.2 | YES | YES       |           |              |
        0x32: "5.0", // | 5.0 |     |           |           |              |
        0x33: "5.1", // | 5.1 |     |           |           |              |
    };

// --- class / interfaces ----------------------------------
var MP4Muxer = {
    "VERBOSE":      VERBOSE,
    "mux":          MP4Muxer_mux, // MP4Muxer.mux(nalUnitObjectArray:NALUnitObjectArray, options:Object = {}):MP4BoxTreeObject
    "repository":   "https://github.com/uupaa/MP4Muxer.js",
};

// --- implements ------------------------------------------
function MP4Muxer_mux(nalUnitObjectArray, // @arg NALUnitObjectArray - [NALUnitObject, ...]
                      options) {          // @arg Object = {} - { audioMetaData }
                                          // @options.audioMetaData AudioMetaDataObject = null
                                          // @ret MP4BoxTreeObject
    options = options || {};

    var accessUnitArray = _createAccessUnit(nalUnitObjectArray); // [AccessUnit, ...]
    var sampleLength    = accessUnitArray.length;
    var audioMetaData   = options["audioMetaData"] || {};
    var audioDuration   = audioMetaData["duration"] || 0;
    var arrangedTimes   = _arrangeTimeScale(sampleLength, audioDuration); // { duration:UINT32, timescale:UINT32 }
    var mdhd_timescale  = options["timescale"] || arrangedTimes.timescale;
    var mdhd_duration   = mdhd_timescale * audioDuration >>> 0;

    var timesacle       = 1000; // 1000 = 1ms
    var duration        = audioDuration * timesacle >>> 0;

    var meta = {
            mvhd: {
                timesacle:              timesacle,
                duration:               duration,   // audioDuration * timescale
                rate:                   0x10000,    // playback rate, 0x10000 >> 16 = 1.0
            },
            tkhd: {
                duration:               duration,   // audioDuration * timescale
                width:                  _getWidth(accessUnitArray)  << 16, // 16.16 format
                height:                 _getHeight(accessUnitArray) << 16, // 16.16 format
            },
            elst: {
                segment_duration:       duration,   // audioDuration * timescale
                media_time:             0,
                media_rate_integer:     1,
                media_rate_fraction:    0,
            },
            mdhd: {
                timescale:              mdhd_timescale,
                duration:               mdhd_duration,
            },
            stbl: {
                "stsd": { // Sample description - トラックデータ再生のためのヘッダ情報です
                    "entry_count":          1,
                    "avc1":                 _avc1(nalUnitObjectArray, accessUnitArray),
                },
                "stts": { // Time-to-sample - トラックデータの単位ごとの再生時間の表です(Sample毎の時間情報を定義したテーブルです)
                          // 各Sampleの再生時間(duration)は samples[n].sample_delta で定義します
                          // このテーブルに限りテーブルをランレングス圧縮します。entry_count の値は圧縮後のテーブルサイズ(行数)になります
                          // Sample の duration を Samples.length で均等割する場合は、entry_count は 1 で固定にします
                          // stts は duration を格納するテーブルで stsz は sample 毎のサイズを格納するテーブルです
                    "entry_count":            1,
                    "samples": [{
                        "sample_count":     sampleLength,
                        "sample_delta":     (mdhd_duration / sampleLength) | 0, // 均等割. 端数は捨てる
                    }]
                },
                "stsc": { // Sample-to-chunk - mdat上のトラックデータの固まりごとの長さ(ビデオの場合はフレーム数)の表です
                          // stsc は1つのChunkに何個サンプルがあるかを定義するテーブルです
                    "entry_count":            1,
                    "samples": [{
                        "first_chunk":        1,
                        "samples_per_chunk":  sampleLength,
                        "sample_description_index": 1,
                    }],
                },
                "stsz": { // Sample size framing - トラックデータ再生単位ごとのデータ長の表です
                          // stsz は Sample 単位の byteSize を格納するテーブルです
                          // stts は duration を格納するテーブルで stsz は sample 毎のサイズを格納するテーブルです
                    "sample_size":          0,
                    "sample_count":         sampleLength,
                    "samples":              _get_stsz_samples(accessUnitArray),
                },
                "stco": { // Chunk offset - ファイル上のトラックデータの固まりの先頭位置を示す表です
                          // stco は mdat.data 部分の file offset を格納するテーブルです
                    "entry_count":          1,
                    "samples": [{
                        "chunk_offset":     0 // この値は MP4Muxer.mux では分からないため、MP4Builder で最後に設定する事になります
                    }]
                },
            },
        };


    return _buildMP4Box(nalUnitObjectArray, accessUnitArray, meta);
}

function _createAccessUnit(nalUnitObjectArray) { // @arg NALUnitObjectArray - [NALUnitObject, ...]
                                                 // @ret AccessUnitArray - [AccessUnit, ...]
    // NALUnitObjectの配列からAccessUnitの先頭(AU)を探し、AccessUnit単位でNALUnitをまとめる
    var parameterSet    = new ParameterSet(); // SPS, PPS Container
    var accessUnitArray = [];
    var accessUnit      = null;
    var sample_offset    = 0;

    for (var i = 0, iz = nalUnitObjectArray.length; i < iz; ++i) {
        var nalUnitObject = nalUnitObjectArray[i]; // { nal_ref_idc, nal_unit_type, nal_unit_size, index, data, NAL_UNIT_TYPE }
        var nalUnitSize   = nalUnitObject["data"].length;
        var nalUnitType   = nalUnitObject["nal_unit_type"];

        switch (nalUnitType) {
        case 9: // AUD
            if (accessUnit) {
                accessUnitArray.push(accessUnit);
            }
            accessUnit = _newAcessUnit(sample_offset);
            accessUnit.AUD = new AUD(nalUnitObject, parameterSet);
            break;
        case 7: // SPS
            accessUnit = accessUnit || _newAcessUnit(sample_offset);
            accessUnit.SPS = new SPS(nalUnitObject, parameterSet); // 仮設定(IDRで再設定する場合もある)
            break;
        case 8: // PPS
            accessUnit = accessUnit || _newAcessUnit(sample_offset);
            accessUnit.PPS = new PPS(nalUnitObject, parameterSet); // 仮設定(IDRで再設定する場合もある)
            break;
        case 6: // SEI
            accessUnit = accessUnit || _newAcessUnit(sample_offset);
            accessUnit.SEI = new SEI(nalUnitObject, parameterSet);
            break;
        case 5: // IDR
            accessUnit = accessUnit || _newAcessUnit(sample_offset);
            var idr    = new IDR(nalUnitObject, parameterSet);
            var pps_id = idr["pic_parameter_set_id"];
            var sps_id = parameterSet.getPPS(pps_id)["seq_parameter_set_id"];

            // 仮設定された accessUnit.SPS と accessUnit.PPS が存在する場合もあるが、
            // IDR.pic_parameter_set_id が参照している pps_id と sps_id に再設定する
            accessUnit.SPS = parameterSet["getSPS"](sps_id);
            accessUnit.PPS = parameterSet["getPPS"](pps_id);
            accessUnit.IDR = idr;
            break;
        case 1: // NON_IDR
            var non_idr = new NON_IDR(nalUnitObject, parameterSet);

            accessUnit.NON_IDR.push(non_idr);
            break;
        default:
            if (MP4Muxer["VERBOSE"]) {
                console.warn("UNSUPPORTED NALUnit: " + nalUnitType);
            }
        }
        sample_offset          += 4 + nalUnitSize; // 4 = NALUnitSize(4byte)
        accessUnit.sample_size += 4 + nalUnitSize;
    }
    if (accessUnit) { // add remain accessUnit
        accessUnitArray.push(accessUnit);
    }
    return accessUnitArray;

    function _newAcessUnit(sample_offset) {
        return {
            sample_offset:  sample_offset,  // mdat の data 部分を起点とした byte offset
            sample_size:    0,              // stsz.sample_size
            AUD:            null,
            SPS:            null,
            PPS:            null,
            SEI:            null,
            IDR:            null,
            NON_IDR:        [],
        };
    }
}

function _buildMP4Box(nalUnitObjectArray, // @arg NALUnitObjectArray - [NALUnitObject, ...]
                      accessUnitArray,    // @arg AccessUnitArray - [AccessUnit, ...]
                      meta) {             // @arg Object
                                          // @ret MP4BoxTreeObject
    var na = nalUnitObjectArray;
    var au = accessUnitArray;

    var ftyp = _ftyp(na, au);
    var moov = _moov(na, au, meta);
    var mdat = { "data": _create_mdat_data(na) };
    var free = { "data": [] };

    var mp4tree = {
            "root": {
                "ftyp": ftyp,
                "moov": moov,
                "mdat": mdat,
                "free": free,
            },
            "dump": function() {
                return JSON.stringify(this, _dump_replacer, 2);
            },
            "diagnostic": function() {
                return _createDiagnosticInformation(this);
            }
        };

    return mp4tree;
}

function _dump_replacer(key, value) {
    if (value.BYTES_PER_ELEMENT && value.length >= 5) {
        return "[" + [value[0].toString(16),
                      value[1].toString(16),
                      value[2].toString(16),
                      value[3].toString(16)].join(",") + " ...]";
    }
    if (Array.isArray(value) && typeof value[0] === "number" && value.length >= 5) {
        return "[" + [value[0].toString(16),
                      value[1].toString(16),
                      value[2].toString(16),
                      value[3].toString(16)].join(",") + " ...]";
    }
    return value;
}

function _createDiagnosticInformation(tree) { // @arg MP4BoxTreeObject
                                              // @ret DiagnosticInformationObject - { ... }
    return {
        "timescale":            tree["root"]["moov"]["mvhd"]["timescale"],
        "duration":             tree["root"]["moov"]["mvhd"]["duration"],
        "bitrate":              tree["root"]["moov"]["mvhd"]["rate"] / 0x10000, // >> 16,
        "tracks":               tree["root"]["moov"]["trak"].length,
        "mdhd_timescale":       tree["root"]["moov"]["trak"][0]["mdia"]["mdhd"]["timescale"],
        "mdhd_duration":        tree["root"]["moov"]["trak"][0]["mdia"]["mdhd"]["duration"],
//      "samples":
        "track0_isVideoTrack":  _isVideoTrack(tree, 0),
        "track0_codec":         _getCodec(tree, 0),
        "track0_track_ID":      tree["root"]["moov"]["trak"][0]["tkhd"]["track_ID"], // 1 or 2 (maybe 1)
        "track0_duration":      tree["root"]["moov"]["trak"][0]["tkhd"]["duration"],
        "track0_width":         tree["root"]["moov"]["trak"][0]["tkhd"]["width"]  >>> 16,
        "track0_height":        tree["root"]["moov"]["trak"][0]["tkhd"]["height"] >>> 16,
        "mdat": function() {
            MP4Parser["mdat"]["dump"](tree["root"]["mdat"]["data"]);
        },
    };
}

function _ftyp(na, au) {
    var sps         = au[0].SPS;            // SPS pickup from first AU sample
    var profile_idc = sps["profile_idc"];   // 66 = Base profile
    var level_idc   = sps["level_idc"];     // 30 = Level 3.0

    if (MP4Muxer["VERBOSE"]) {
        console.info("ftyp", "profile", PROFILES[profile_idc], "level", LEVELS[level_idc]);
    }
    return {
        "major_brand":       "isom",
        "minor_version":     512,
        "compatible_brands": ["isom", "iso2", "avc1", "mp41"]
    };
}

function _moov(na, au, meta) {
    return {
        "mvhd": _mvhd(na, au, meta),
        "trak": _trak(na, au, meta),
        "udta": {
            "meta": {
                "hdlr": {
                    "handler_type":  0x6d646972, // "mdir"
                    "handler_type2": 0x6170706c, // "appl"
                    "name":          "",
                },
                "ilst": {
                    "data": [
                        0, 0, 0, 37, 169, 116, 111, 111,
                        0, 0, 0, 29, 100, 97, 116, 97,
                        0, 0, 0, 1, 0, 0, 0, 0,
                        76, 97, 118, 102, 53, 54, 46, 52,
                        48, 46, 49, 48, 49
                    ]
                },
            },
        },
    };
}

function _mvhd(na, au, meta) {
    return {
        "creation_time":    0,
        "modification_time": 0,
        "timescale":        meta.mvhd.timescale,
        "duration":         meta.mvhd.duration,
        "rate":             meta.mvhd.rate,
        "volume":           0x0100,
        "matrix":           [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824], // fixed value
        "next_track_ID":    2,  // fixed value
    };
}

function _trak(na, au, meta) {
    var videoTrack = {
        "tkhd": {
            "flags":                    3, // [!][NEED] MAGIC VALUE. UNDOCUMENTED
            "creation_time":            0,
            "modification_time":        0,
            "track_ID":                 1,
            "duration":                 meta.tkhd.duration,
            "layer":                    0,
            "alternate_group":          0,
            "volume":                   0,
            "matrix":                   [65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824],
            "width":                    meta.tkhd.width,
            "height":                   meta.tkhd.height,
        },
        "edts": {
            "elst": {
                "entry_count": 1,
                "entries": [{
                    "segment_duration":     meta.elst.segment_duration,
                    "media_time":           meta.elst.media_time,
                    "media_rate_integer":   meta.elst.media_rate_integer,
                    "media_rate_fraction":  meta.elst.media_rate_fraction,
                }],
            },
        },
        "mdia": {
            "mdhd": {
                "creation_time":        0,                      // 4byte
                "modification_time":    0,                      // 4byte
                "timescale":            meta.mdhd.timeScale,    // 4byte
                "duration":             meta.mdhd.duration,     // 4byte
                "language":             "und",                  // 3byte
            },
            "hdlr": {
                "handler_type":         0x76696465,             // 4byte "vide"
                "handler_type2":        0x6d646972,             // 4byte "appl" [!][NEED] UNDOCUMENTED
                "name":                 "VideoHandler",         // fixed value
            },
            "minf": {
                "vmhd": {
                    "flags":            1,                      // [!][NEED]
                    "graphicsmode":     0,                      // fixed value
                    "opcolor":          [0, 0, 0],              // fixed value
                },
                "dinf": {
                    "dref": {
                        "entry_count":  1,
                        "url ": [{
                            "flags":    1,                      // [!][NEED]
                            "url":      "",
                        }]
                    },
                },
                "stbl": meta.stbl,
            },
        },
    };
    return [ videoTrack ];
}

function _avc1(na, au) {
    var sps = au[0].SPS;
    var pps = au[0].PPS;

    return {
        "avcC":                 { // AVCDecoderConfigurationRecord
            "configurationVersion":         1,
            "AVCProfileIndication":         66, // 66 = Baseline profile
            "profile_compatibility":        192,
            "AVCLevelIndication":           30, // 30 = Level 3.0
            "lengthSizeMinusOne":           3,
            "numOfSequenceParameterSets":   1,
            "SPS": [{
                "sequenceParameterSetLength":   sps["avcC_sequenceParameterSetLength"],
                "sequenceParameterSetNALUnit":  sps["avcC_sequenceParameterSetNALUnit"],
            }],
            "numOfPictureParameterSets":    1,
            "PPS": [{
                "pictureParameterSetLength":    pps["avcC_pictureParameterSetLength"],
                "pictureParameterSetNALUnit":   pps["avcC_pictureParameterSetNALUnit"],
            }]
        },
        "compressorname":       String.fromCharCode.apply(null, new Uint8Array(32)),
        "data_reference_index": 1,
        "depth":                0x18,       // 0x0018
        "frame_count":          1,
        "width":                _getWidth(au),
        "height":               _getHeight(au),
        "horizresolution":      0x00480000, // 72dpi = 4718592
        "vertresolution":       0x00480000, // 72dpi = 4718592
    };
}

function _create_mdat_data(nalUnitObjectArray) {
    var buffer = new Uint8Array( _get_mdat_mp4BoxSize(nalUnitObjectArray) );
    var cursor = 0;

    for (var i = 0, iz = nalUnitObjectArray.length; i < iz; ++i) {
        var nalUnit     = nalUnitObjectArray[i]["data"];
        var nalUnitSize = nalUnit.length;

        buffer[cursor + 0] = (nalUnitSize >> 24 & 0xff);
        buffer[cursor + 1] = (nalUnitSize >> 16 & 0xff);
        buffer[cursor + 2] = (nalUnitSize >>  8 & 0xff);
        buffer[cursor + 3] = (nalUnitSize >>  0 & 0xff);

        buffer.set( nalUnit, cursor + 4 );
        cursor += nalUnitSize + 4;
    }
    return buffer;

    function _get_mdat_mp4BoxSize(nalUnitObjectArray) {
        return nalUnitObjectArray.reduce(function(size, nalUnitObject) {
            return size + nalUnitObject["data"].length + 4;
        }, 0);
    }
}

function _isVideoTrack(tree,         // @arg MP4BoxTreeObject
                       trackIndex) { // @arg UINT8
                                     // @ret Boolean
    var hdlr = tree["root"]["moov"]["trak"][trackIndex]["mdia"]["hdlr"];
    var tkhd = tree["root"]["moov"]["trak"][trackIndex]["tkhd"];

    if (hdlr["handler_type"] === 0x76696465) { // "vide"
        if (tkhd["width"] && tkhd["height"]) {
            return true; // is Video track
        }
    }
    return false; // is Audio track
}

function _getCodec(tree,         // @arg MP4BoxTreeObject
                   trackIndex) { // @arg UINT8
                                 // @ret String - "H264", "AAC"
    var hdlr = tree["root"]["moov"]["trak"][trackIndex]["mdia"]["minf"]["stbl"]["stsd"];

    if (hdlr["avc1"]) {
        return "H264";
    }
    if (hdlr["mp4a"]) {
        return "AAC";
    }
    return "";
}

// VideoはMP4全体でWidthとHeightは固定なので、先頭のAUからMP4全体で使用する幅と高さを求める事ができる
function _getWidth(au) {
    var sps = au[0].SPS;
    // http://stackoverflow.com/questions/6394874/fetching-the-dimensions-of-a-h264video-stream
    // http://stackoverflow.com/questions/31919054/h264-getting-frame-height-and-width-from-sequence-parameter-set-sps-nal-unit
    return ((sps["pic_width_in_mbs_minus1"] + 1) * 16) -
             sps["frame_crop_right_offset"] * 2 -
             sps["frame_crop_left_offset"]  * 2;
}

function _getHeight(au) {
    var sps = au[0].SPS;
    // http://stackoverflow.com/questions/6394874/fetching-the-dimensions-of-a-h264video-stream
    // http://stackoverflow.com/questions/31919054/h264-getting-frame-height-and-width-from-sequence-parameter-set-sps-nal-unit
    return ((2 - sps["frame_mbs_only_flag"]) * (sps["pic_height_in_map_units_minus1"] + 1) * 16) -
            (sps["frame_crop_top_offset"]    * 2) -
            (sps["frame_crop_bottom_offset"] * 2);
}

function _get_stsz_samples(accessUnitArray) { // @arg AccessUnitObjectArray - [AccessUnit, ...]
                                              // @ret STSZObjectArray - [{ entry_size }, ... ]
    var result = [];

    for (var i = 0, iz = accessUnitArray.length; i < iz; ++i) {
        var au = accessUnitArray[i];

        result.push({ "entry_size": au.sample_size });
    }
    return result;
}

function _arrangeTimeScale(sampleLength, // @arg UINT32
                           duration) {   // @arg Number
                                         // @ret Object - { duration: UINT32, timescale: UINT32 }

    // mdhd_timescale, mdhd_duration を格納する変数は int 型になるため、
    // できるだけ端数がでないようにtimescaleを決めないと誤差がでてしまう
    //
    // [1] duration の小数点第四位までを保証した状態で補正し
    // [2] 2の倍数に丸め
    // [3] sampleLength と duration の最小公倍数を求め返す

    if (sampleLength === 0) {
        throw new Error("BAD ARGUMENT. sampleLength is zero");
    }
    var originalDuration = duration;
    var timescale = 0;

    duration = (duration * 10000) | 0; // [1] 小数点以下4桁まで保持するため 10000倍する
    duration = (duration >> 1) << 1;   // [2] 2の倍数に丸める

    if (sampleLength === 1) {
        timescale = duration;
    } else {
        timescale = _getLeastCommonMultiple(sampleLength, duration); // [3]
    }
    if (MP4Muxer["VERBOSE"]) {
        console.info("original duration = " + originalDuration,
                     "timescale = " + timescale,
                     "sampleLength = " + sampleLength);
    }
    return { duration: duration, timescale: timescale };
}

function _getLeastCommonMultiple(a,   // @arg UINT32
                                 b) { // @arg UINT32
                                      // @ret UINT32
                                      // @desc calculate Least common multiple (lcm 最小公倍数)
    // _getLeastCommonMultiple(12, 18) -> 36
    var r = 1;

    while ( a % 2  === 0 && b % 2  === 0 ) { a /= 2;  b /= 2;  r *= 2;  }
    while ( a % 3  === 0 && b % 3  === 0 ) { a /= 3;  b /= 3;  r *= 3;  }
    while ( a % 5  === 0 && b % 5  === 0 ) { a /= 5;  b /= 5;  r *= 5;  }
    while ( a % 7  === 0 && b % 7  === 0 ) { a /= 7;  b /= 7;  r *= 7;  }
    while ( a % 11 === 0 && b % 11 === 0 ) { a /= 11; b /= 11; r *= 11; }
    while ( a % 13 === 0 && b % 13 === 0 ) { a /= 13; b /= 13; r *= 13; }
    return r * a * b;
}

/*
function _getGreatestCommonDivisor(a,   // @arg UINT32
                                   b) { // @arg UINT32
                                        // @ret UINT32
                                        // @desc calculate greatest common divisor (gcd 最大公約数)
    // _getGreatestCommonDivisor(12, 18) -> 6
    // _getGreatestCommonDivisor(18, 27) -> 9
    // _getGreatestCommonDivisor(2, 31) -> 9
    var r = 1;

    while ( a % 2  === 0 && b % 2  === 0 ) { a /= 2;  b /= 2;  r *= 2;  }
    while ( a % 3  === 0 && b % 3  === 0 ) { a /= 3;  b /= 3;  r *= 3;  }
    while ( a % 5  === 0 && b % 5  === 0 ) { a /= 5;  b /= 5;  r *= 5;  }
    while ( a % 7  === 0 && b % 7  === 0 ) { a /= 7;  b /= 7;  r *= 7;  }
    while ( a % 11 === 0 && b % 11 === 0 ) { a /= 11; b /= 11; r *= 11; }
    while ( a % 13 === 0 && b % 13 === 0 ) { a /= 13; b /= 13; r *= 13; }
    return r;
}
 */

return MP4Muxer; // return entity

});

