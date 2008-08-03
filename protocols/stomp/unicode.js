// Copyright (C) 2008 Marcus Cavanaugh and Orbited
// 
// This library is free software; you can redistribute it and/or modify it under the
// terms of the GNU Lesser General Public License as published by the Free Software
// Foundation; either version 2.1 of the License, or (at your option) any later
// version.
// 
// This library is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
// PARTICULAR PURPOSE. See the GNU Lesser General Public License for more details.
// 
// You should have received a copy of the GNU Lesser General Public License along with
// this library; if not, write to the Free Software Foundation, Inc., 59 Temple Place,
// Suite 330, Boston, MA 02111-1307 USA

function bytesToUTF8(bytes) {    
    var ret = [];
    
    function pad6(str) {
        while(str.length < 6) { str = "0" + str; } return str;
    }
    
    for (var i=0; i < bytes.length; i++) {
        if ((bytes[i] & 0xf8) == 0xf0) {
            ret.push(String.fromCharCode(parseInt(
                         (bytes[i] & 0x07).toString(2) +
                  pad6((bytes[i+1] & 0x3f).toString(2)) +
                  pad6((bytes[i+2] & 0x3f).toString(2)) +
                  pad6((bytes[i+3] & 0x3f).toString(2))
                , 2)));
            i += 3;
        } else if ((bytes[i] & 0xf0) == 0xe0) {
            ret.push(String.fromCharCode(parseInt(
                         (bytes[i] & 0x0f).toString(2) +
                  pad6((bytes[i+1] & 0x3f).toString(2)) +
                  pad6((bytes[i+2] & 0x3f).toString(2))
                , 2)));
            i += 2;
        } else if ((bytes[i] & 0xe0) == 0xc0) {
                ret.push(String.fromCharCode(parseInt(
                       (bytes[i] & 0x1f).toString(2) +
                pad6((bytes[i+1] & 0x3f).toString(2), 6)
                , 2)));
            i += 1;
        } else {
            ret.push(String.fromCharCode(bytes[i]));
        }
    }
    
    return ret.join("");
}

function UTF8ToBytes(text) {
    var ret = [];
    
    function pad(str, len) {
        while(str.length < len) { str = "0" + str; } return str;
    }
    
    for (var i=0; i < text.length; i++) {
        var chr = text.charCodeAt(i);
        if (chr <= 0x7F) {
            ret.push(chr);
        } else if(chr <= 0x7FF) {
            var binary = pad(chr.toString(2), 11);
            ret.push(parseInt("110"   + binary.substr(0,5), 2));
            ret.push(parseInt("10"    + binary.substr(5,6), 2));
        } else if(chr <= 0xFFFF) {
            var binary = pad(chr.toString(2), 16);
            ret.push(parseInt("1110"  + binary.substr(0,4), 2));
            ret.push(parseInt("10"    + binary.substr(4,6), 2));
            ret.push(parseInt("10"    + binary.substr(10,6), 2));
        } else if(chr <= 0x10FFFF) {
            var binary = pad(chr.toString(2), 21);
            ret.push(parseInt("11110" + binary.substr(0,3), 2));
            ret.push(parseInt("10"    + binary.substr(3,6), 2));
            ret.push(parseInt("10"    + binary.substr(9,6), 2));
            ret.push(parseInt("10"    + binary.substr(15,6), 2));
        }
    }
    return ret;
}
