var currOut = '';
var retData;

var makeArrays = function (data){
    var outCodes = {}, tPost, tOut;
    data.forEach(function(h,i){
        tPost = h[4].trim();
        tOut = tPost.substr(tPost.length-3);
        if(!outCodes[tOut[0]]) outCodes[tOut[0]]={};
        if(!outCodes[tOut[0]][tOut[1]]) outCodes[tOut[0]][tOut[1]] = {data:[], totalSales:0};
        outCodes[tOut[0]][tOut[1]].data.push(h);
    })
    return outCodes;
}

var getData = function(outCode){
    return new Promise(function(resolve, reject){
        if(outCode != currOut){
            $.getJSON( "https://api-encraft.rhcloud.com/housesales/"+outCode.toUpperCase()+'.json', function( data ) {
                retData = makeArrays(data.data);
                return resolve(retData);
            })
            currOut = outCode;
        }else{
           return resolve(retData);
        }
    })
}

var makePolys = function(retData){
    var tLatLng;
    for (var h in retData){
        for(var c in retData[h]){
            if(!retData[h][c].polygon){
                retData[h][c].polygon = {
                    points:[],
                    // bounds: new google.maps.LatLngBounds(),
                    polygon: new google.maps.Polygon({paths:[]})
                }
                retData[h][c].totalSales = 0;
                retData[h][c].totalPricePerHabRoom = 0;
                retData[h][c].totalPricePerArea = 0;
                retData[h][c].totalHabRoom =  0;
                retData[h][c].averageHabRoom =  0;
                retData[h][c].totalArea = 0;
                retData[h][c].averageArea = 0;
                retData[h][c].averagePrice = 0; 
                retData[h][c].medianPricePerHabRoomArr = [];
                retData[h][c].medianPricePerAreaArr = [];

                for(var r =0;r < retData[h][c].data.length; r++){

                    retData[h][c].totalPricePerHabRoom += (retData[h][c].data[r][18]*1 != 0 ? (retData[h][c].data[r][2]*1) / (retData[h][c].data[r][18]*1) : 0);
                    retData[h][c].totalPricePerArea += (retData[h][c].data[r][19]*1 != 0 ? (retData[h][c].data[r][2]*1) / (retData[h][c].data[r][19]*1) : 0);
                    retData[h][c].totalHabRoom +=  (retData[h][c].data[r][18]*1);
                    retData[h][c].totalArea += (retData[h][c].data[r][19]*1);
                    retData[h][c].totalSales += (retData[h][c].data[r][2]*1);
                    if(retData[h][c].data[r][18]*1 != 0) retData[h][c].medianPricePerHabRoomArr.push((retData[h][c].data[r][2]*1) / (retData[h][c].data[r][18]*1));
                    if(retData[h][c].data[r][19]*1 != 0) retData[h][c].medianPricePerAreaArr.push((retData[h][c].data[r][2]*1) / (retData[h][c].data[r][19]*1));

                    if(retData[h][c].data[r][21] != 0 && retData[h][c].data[r][22] != 0){
                        tLatLng = new google.maps.LatLng(retData[h][c].data[r][21],retData[h][c].data[r][22]);
                        if(!google.maps.geometry.poly.containsLocation(tLatLng, retData[h][c].polygon.polygon)){
                            retData[h][c].polygon.points.push(tLatLng);
                            retData[h][c].polygon.polygon = new google.maps.Polygon({
                                paths: retData[h][c].polygon.points
                            });
                        }
                    }
                }

                retData[h][c].averagePrice = retData[h][c].totalSales / retData[h][c].data.length;
                retData[h][c].averageHabRoom = retData[h][c].totalHabRoom / retData[h][c].data.length;
                retData[h][c].averageArea = retData[h][c].totalArea / retData[h][c].data.length;
                retData[h][c].averagePricePerHabRoom1 =  retData[h][c].totalPricePerHabRoom / retData[h][c].data.length;
                retData[h][c].averagePricePerAreaRoom1 = retData[h][c].totalPricePerArea / retData[h][c].data.length;
                retData[h][c].averagePricePerHabRoom2 = retData[h][c].totalSales / retData[h][c].totalHabRoom;
                retData[h][c].averagePricePerAreaRoom2 = retData[h][c].totalSales / retData[h][c].totalArea;
                retData[h][c].medianPricePerHabRoomArr.sort();
                retData[h][c].medianPricePerAreaArr.sort();
                retData[h][c].medianPricePerHabRoom = retData[h][c].medianPricePerHabRoomArr[Math.floor(retData[h][c].medianPricePerHabRoomArr.length/2)];
                retData[h][c].medianPricePerArea = retData[h][c].medianPricePerAreaArr[Math.floor(retData[h][c].medianPricePerAreaArr.length/2)];


            }
        }
    }
    return (retData);
}

function highlightData(poly,id){
    for (var h in retData){
        for(var c in retData[h]){
            if(retData[h][c].polygon){
                retData[h][c].polygon.bounds.setOptions({strokeOpacity: 0.5, fillOpacity: 0.35, zIndex: retData[h][c].polygon.bounds.origZ});
            }
        }
    }
    $('.table_row').removeClass('selectedRow');
    if(!poly){
        $('.table_'+id).addClass('selectedRow');
        for (var h in retData){
            for(var c in retData[h]){
                if(retData[h][c].polygon){
                    console.log(retData[h][c].polygon.bounds.pid)
                    if(retData[h][c].polygon.bounds.pid == id){
                        retData[h][c].polygon.bounds.setOptions({strokeOpacity: 1, fillOpacity: 0.8, zIndex: 1000});
                    }
                }
            }
        } 
    }else{
        poly.setOptions({strokeOpacity: 1, fillOpacity: 0.8});
        $('.table_'+poly.pid).addClass('selectedRow');
    }
}

var drawOnMap = function(data, detail){

    var lowHabRoom = 1000000, highHabRoom = 0, lowArea = 1000000, highArea = 0, midHabRoom = 0, midArea = 0;
    
    for(var i in data){
        for(var l in data[i]){
            if(data[i][l].polygon.bounds) data[i][l].polygon.bounds.setMap(null);
            if(data[i][l].medianPricePerHabRoom !== 'undefined' && data[i][l].medianPricePerHabRoom < lowHabRoom) lowHabRoom = data[i][l].medianPricePerHabRoom;
            if(data[i][l].medianPricePerHabRoom !== 'undefined' && data[i][l].medianPricePerHabRoom > highHabRoom) highHabRoom = data[i][l].medianPricePerHabRoom;
            if(data[i][l].medianPricePerArea !== 'undefined' && data[i][l].medianPricePerArea < lowArea) lowArea = data[i][l].medianPricePerArea;
            if(data[i][l].medianPricePerArea !== 'undefined' && data[i][l].medianPricePerArea > highArea) highArea = data[i][l].medianPricePerArea;
        }
    }
    midHabRoom = lowHabRoom + ((highHabRoom - lowHabRoom)/2);
    midArea = lowArea + ((highArea - lowArea)/2);

    function getColours(medArea, medRooms){
        var medArr = [lowArea, midArea, highArea];
        var numC = medArr.reduce(function (prev, curr) {
            return (Math.abs(curr - medArea) < Math.abs(prev - medArea) ? curr : prev);
        });
        if(numC == lowArea){
            return ['#5bc0de', '#fff'];
        }else if(numC == midArea){
            return ['#f0ad4e', '#fff'];
        }else{
            return ['#d9534f', '#fff'];
        }
    }

    var points = [];
    var bounds = new google.maps.LatLngBounds();

    function drawRect(data, id, sortOrder){
        var tCol = getColours(data.medianPricePerArea, data.medianPricePerHabRoom);
        return(new google.maps.Rectangle({
                strokeColor: tCol[1],
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: tCol[0],
                fillOpacity: 0.35,
                map: map,
                bounds: data.polygon.polygon.getBounds(),
                pid: id,
                sortOrder: sortOrder
            })
        );
    }
    var polyArr = [];
    // if(detail.length > 0){
        if(detail[0]){
            if(detail[1] && data[detail[0]][detail[1].toUpperCase()]){
                //write out within letter
                var TLet = data[detail[0]][detail[1].toUpperCase()];
                TLet.polygon.bounds = drawRect(TLet, detail[0]+detail[1].toUpperCase(),TLet.data.length);
                google.maps.event.addListener(TLet.polygon.bounds, 'click', function (event) {
                        highlightData(this);
                });
                polyArr.push(TLet.polygon.bounds);
                TLet.polygon.bounds.setMap(map);
                points.push(...TLet.polygon.points)
            }else{
                //write within number
                for(var l in data[detail[0]]){
                    data[detail[0]][l].polygon.bounds = drawRect(data[detail[0]][l],detail[0]+l,data[detail[0]][l].data.length);
                    google.maps.event.addListener(data[detail[0]][l].polygon.bounds, 'click', function (event) {
                            highlightData(this);
                    });
                    polyArr.push(data[detail[0]][l].polygon.bounds);
                    data[detail[0]][l].polygon.bounds.setMap(map);
                    points.push(...data[detail[0]][l].polygon.points);
                }
            }
        }else{
            //write out all numnbers and all letters
            for(var i in data){
                 for(var l in data[i]){
                    data[i][l].polygon.bounds = drawRect(data[i][l], i+l, data[i][l].data.length);
                    google.maps.event.addListener(data[i][l].polygon.bounds, 'click', function (event) {
                        highlightData(this);
                    });
                    polyArr.push(data[i][l].polygon.bounds);
                    data[i][l].polygon.bounds.setMap(map);
                    points.push(...data[i][l].polygon.points);
                }
            }
        }
    // }
    polyArr.sort(function(a,b) {
        if (a.sortOrder < b.sortOrder)
            return -1;
        if (a.sortOrder > b.sortOrder)
            return 1;
        return 0;
    });
    for(var i=0;i<polyArr.length;i++){
        // console.log(polyArr[i])
        // polyArr[i].setZIndex(polyArr.length - i);zIndex
        polyArr[i].setOptions({zIndex:polyArr.length - i});
        polyArr[i].origZ = polyArr.length - i;
    }
    for (var i = 0; i < points.length; i++) {
        bounds.extend(points[i]);
    }
    map.panTo(bounds.getCenter());
    map.fitBounds(bounds);
}

var fillOutTable = function(data, detail, outCode){
    // console.log(data)
    function drawRow(id, postcode, dataLength, data){
        return(
            '<tr class="table_row table_'+id+'" data-pid="'+id+'">'+
                    '<td>'+postcode.toUpperCase()+'</td>'+
                    '<td>'+dataLength+'</td>'+
                    '<td>'+Math.round(data.averagePrice)+'</td>'+
                    '<td>'+Math.round(data.averageHabRoom)+'</td>'+
                    '<td>'+Math.round(data.averageArea)+'</td>'+
                    '<td>'+Math.round(data.averagePricePerHabRoom1)+'</td>'+
                    '<td>'+Math.round(data.averagePricePerHabRoom2)+'</td>'+
                    '<td>'+Math.round(data.medianPricePerHabRoom)+'</td>'+ 
                    '<td>'+Math.round(data.averagePricePerAreaRoom1)+'</td>'+
                    '<td>'+Math.round(data.averagePricePerAreaRoom2)+'</td>'+                    
                    '<td>'+Math.round(data.medianPricePerArea)+'</td>'+                    
                '</tr>'
        )
    }
    $('#resultsBody').empty();
    if(detail[0]){
        if(detail[1] && data[detail[0]][detail[1].toUpperCase()]){
            var TLet = data[detail[0]][detail[1].toUpperCase()];
            $('#resultsBody').append(drawRow(detail[0]+detail[1].toUpperCase(), outCode+' '+detail[0]+detail[1].toUpperCase(), TLet.data.length, TLet));
        }else{
            //write within number
            for(var l in data[detail[0]]){
                 $('#resultsBody').append(drawRow(detail[0]+l,outCode+' '+detail[0]+l, data[detail[0]][l].data.length, data[detail[0]][l]));
            }
        }
    }else{
        //write out all numnbers and all letters
        for(var i in data){
                for(var l in data[i]){
                 $('#resultsBody').append(drawRow(i+l,outCode+' '+i+l, data[i][l].data.length, data[i][l]));
            }
        }
    }
}