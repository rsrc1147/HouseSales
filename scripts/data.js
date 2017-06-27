// --------------------------------------------------------┤ GET WHICH POSTCODES ARE AVAILABLE
var availableData = [];
var houseT = {S:'SemiDetached', D:'Detached', T:'Terrace', F:'Flat'}
var quartileR = {a: '1st', b: '2nd', c:'3rd', d:'4th'}
var containingPoly, table;
$.getJSON( "https://api-encraft.rhcloud.com/housesales/listData", function( data ) {
    availableData = data.data
    $('#outCode').selectize({
        delimiter: ',',
        maxOptions: 2500,
        options: availableData,
        labelField: "name",
        valueField: "file",
        searchField: 'name',
        sortField: 'sortBy'
    });
})

var currData = {};

var getFile = function(fileName){
    return new Promise(function (resolve, reject) {
        $.getJSON( "https://api-encraft.rhcloud.com/housesales/getData/"+fileName, function( data ) {
            return resolve(data);
        })
    })
}

var getData = function(){
    return new Promise(function (resolve, reject) {
        var outCodes = $('#outCode').val().split(',');
        var proms = [];
        
        outCodes.forEach(function(o,i){
            proms.push(getFile(o).then(function(data){
                    data.data.forEach(function(c,i){
                        var thisPost = c[4].trim().substr(0,c[4].length-1);
                        if(!currData[thisPost]) currData[thisPost] = {data:[]};
                        currData[thisPost].data.push(c);
                    })
                })
            );
        })
        
        var items = Promise.all(proms);
        items.then(function(results){
            return resolve();
        })
    });
}

var calcPrices = function(data){
    return new Promise(function (resolve, reject) {
        var proms = [];
        for(var k in data){
            data[k].prices = {
                totalSales : 0,
                totalPricePerHabRoom : 0,
                totalPricePerArea : 0,
                totalHabRoom :  0,
                totalArea : 0,
                averageHabRoom :  0,
                averageArea : 0,
                averagePrice : 0,
                medianPricePerHabRoomArr : [],
                medianPricePerAreaArr : []
            }
            data[k].data.forEach(function(h,i){
                h[23] = (h[18]*1 != 0 ? (h[2]*1) / (h[18]*1) : 0);
                h[24] = (h[19]*1 != 0 ? (h[2]*1) / (h[19]*1) : 0);
                data[k].prices.totalSales += (h[2]*1);
                data[k].prices.totalPricePerHabRoom += h[23];
                data[k].prices.totalPricePerArea += h[24];
                data[k].prices.totalHabRoom += (h[18]*1);
                data[k].prices.totalArea += (h[19]*1);
                if(h[18]*1 != 0) data[k].prices.medianPricePerHabRoomArr.push((h[2]*1) / (h[18]*1));
                if(h[19]*1 != 0) data[k].prices.medianPricePerAreaArr.push((h[2]*1) / (h[19]*1));

                // --------------------------------------------------------┤ TODO: OFFSET PRICES BY INDEX. PUSH EACH CALL TO PROMS

            })

            data[k].prices.averagePrice = data[k].prices.totalSales / data[k].data.length;
            data[k].prices.averageHabRoom = data[k].prices.totalHabRoom / data[k].data.length;
            data[k].prices.averageArea = data[k].prices.totalArea / data[k].data.length;
            data[k].prices.averagePricePerHabRoom1 =  data[k].prices.totalPricePerHabRoom / data[k].data.length;
            data[k].prices.averagePricePerAreaRoom1 = data[k].prices.totalPricePerArea / data[k].data.length;
            data[k].prices.averagePricePerHabRoom2 = data[k].prices.totalSales / data[k].prices.totalHabRoom;
            data[k].prices.averagePricePerAreaRoom2 = data[k].prices.totalSales / data[k].prices.totalArea;
            data[k].prices.medianPricePerHabRoomArr.sort();
            data[k].prices.medianPricePerAreaArr.sort();
            data[k].prices.medianPricePerHabRoom = data[k].prices.medianPricePerHabRoomArr[Math.floor(data[k].prices.medianPricePerHabRoomArr.length/2)];
            data[k].prices.medianPricePerArea = data[k].prices.medianPricePerAreaArr[Math.floor(data[k].prices.medianPricePerAreaArr.length/2)];
        }
        var items = Promise.all(proms);
        items.then(function(results){
            return resolve(data);
        })
    })
}
var polys = [];
var makePolys = function(data){
    
    for(var i = 0; i<polys.length;i++){
        polys[i].setMap(null);
    }

    var containingPoints =[];
    return new Promise(function (resolve, reject) {
        var range = {
            rooms : [],
            areas : []
        }
        for(var i in data){
            range.rooms.push(data[i].prices.medianPricePerHabRoom);
            range.areas.push(data[i].prices.medianPricePerArea);
        }
        range.rooms.sort();
        range.areas.sort();

        function getColours(medArea, medRooms){
            var roomRange = range.rooms.indexOf(medRooms);
            var areaRange = range.areas.indexOf(medArea);
            var a = range.rooms.length / 4;
            var b = a * 2;
            var c = a * 3;

            if(areaRange <= a){
                return ['#5cb85c','#fff','a'];
            }else if(areaRange <= b){
                return ['#5bc0de','#fff', 'b'];
            }else if(areaRange <= c){
                return ['#f0ad4e','#fff','c'];
            }else{
                return ['#d9534f','#fff','d'];
            }

        }
        
        for(var k in data){ 
            data[k].polygon = {
                points:[]

            }
            // --------------------------------------------------------┤ ADD POINTS
            data[k].data.forEach(function(h,i){
                if(h[21] != 0 && h[22] != 0){
                    tLatLng = new google.maps.LatLng(h[21],h[22]);
                    data[k].polygon.points.push(tLatLng);
                    containingPoints.push(tLatLng);
                }
            })
            data[k].polygon.polygon = new google.maps.Polygon({
                paths: data[k].polygon.points
            });
            // --------------------------------------------------------┤ MAKE RECTANGLE FROM POLYGON
            var tCol = getColours(data[k].prices.medianPricePerArea, data[k].prices.medianPricePerHabRoom);
            data[k].prices.quartile = tCol[2];
            data[k].polygon.bounds = new google.maps.Rectangle({
                strokeColor: tCol[1],
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: tCol[0],
                fillOpacity: 0.35,
                bounds: data[k].polygon.polygon.getBounds(),
                pid: k,
                map: map,
            })
            // google.maps.event.addListener(data[k].polygon.bounds, 'click', function (event) {
            //         findPolys(this);
            // });
            data[k].polygon.bounds.addListener('click', findPolys);
            polys.push(data[k].polygon.bounds);
        }
        containingPoly = new google.maps.Polygon({
            paths: containingPoints
        });
        var containingBounds = containingPoly.getBounds();
        map.panTo(containingBounds.getCenter());
        map.fitBounds(containingBounds);
        return resolve(data);
    })
}

var makeFilters = function(data, outC, inC, hType, qT){
    var outcodes = [];
    var incodes = [];
    var houseTypes = [];
    var quartiles = [];
    for(var k in data){
        data[k].data.forEach(function(h,i){
            if(!outcodes.includes(h[0])){
                outcodes.push(h[0]);
            }
            var tIn = h[4].trim().substr(h[4].length-3, 2);
            if(!incodes.includes(tIn)){
                incodes.push(tIn);
            }
            if(!houseTypes.includes(h[5])){
                houseTypes.push(h[5])
            }    
        })
        if(!quartiles.includes(data[k].prices.quartile)){
            quartiles.push(data[k].prices.quartile)
        }
    }

    outcodes = outcodes.sort().map(function(o){return {"item":o, "text":o} });
    incodes = incodes.sort().map(function(o){return {"item":o, "text":o}});
    houseTypes = houseTypes.sort().filter(function(x){return(houseT[x]?true:false)}).map(function(o){return {"item":o, "text": houseT[o]}});
    quartiles = quartiles.sort().map(function(o){return {"item":o, "text": quartileR[o]}});
    var selectOpt = {
        delimiter: ',',
        maxOptions: 2500,
        labelField: "text",
        valueField: "item",
        searchField: 'text'
    }
    if(!outC){
        selectOpt.options = outcodes
        $('#filterOutCode').selectize(selectOpt)
    }
    if(!inC){
        selectOpt.options = incodes
        $('#filterInCode').selectize(selectOpt)
    }
    if(!hType){
        selectOpt.options = houseTypes
        $('#filterHouseType').selectize(selectOpt)
    }
    if(!qT){
        selectOpt.options = quartiles
        $('#filterQuartile').selectize(selectOpt)
    }
}

var applyFilters = function(){
    var outCodeF = ($('#filterOutCode').val() == "" ? [] : $('#filterOutCode').val().split(','));
    var inCodeF = ($('#filterInCode').val() == "" ? [] : $('#filterInCode').val().split(','));
    var HouseTF = ($('#filterHouseType').val() == "" ? [] : $('#filterHouseType').val().split(','));
    var qTF = ($('#filterQuartile').val() == "" ? [] : $('#filterQuartile').val().split(','));
    var retData = {};

    for(var k in currData){
       currData[k].data.forEach(function(h,i){
           var tIn = h[4].trim().substr(h[4].length-3, 2);
           if(qTF.includes( currData[k].prices.quartile) || qTF.length == 0){
                if((outCodeF.includes(h[0]) || outCodeF.length == 0) && (inCodeF.includes(tIn) || inCodeF == 0) && (HouseTF.includes(h[5]) || HouseTF == 0)){
                    if(!retData[k]) retData[k] = {data:[]};
                    retData[k].data.push(h);
                }
           }
       })
    }
    calcPrices(retData)
    .then(function(data){
        return makePolys(data);
    })
    .then(function(data){
        makeFilters(data, (outCodeF.length != 0), (inCodeF != 0), (HouseTF != 0), (qTF.length != 0))
        makeTable(data)
    })
}

var formatTable = function( d, editPolys ) {
    // `d` is the original data object for the row
    if(editPolys){
        for(var i = 0; i<polys.length;i++){
            if(polys[i].pid == d.ID){
                polys[i].setOptions({strokeOpacity: 1, fillOpacity: 0.75, zIndex:1000});
                var containingBounds = polys[i].getBounds();
                map.panTo(containingBounds.getCenter());
                map.fitBounds(containingBounds);                
            }else{
                polys[i].setOptions({strokeOpacity: 0.5, fillOpacity: 0.15});
            }
        }
    }
    var retHTML = '<table cellpadding="5" cellspacing="0" border="0" class="table table-bordered table-condensed">';
    retHTML += '<thead>'+
                '<tr>'+
                    '<th>Address</th>'+
                    '<th>Sale Price</th>'+
                    '<th>Adjusted Price</th>'+
                    '<th>Sale Date</th>'+                        
                    '<th>House Type</th>'+
                    '<th>Number of Rooms</th>'+
                    '<th>FLoor Area</th>'+
                    '<th>Confidence</th>'+
                '</tr>'+
            '</thead>';
    d.Data.forEach(function(h,i){
        retHTML += '<tr>'+
                        '<td><small>'+(h[9] ? h[9]+'<br>' : '')+(h[10] ? h[10]+'<br>' : '')+(h[11] ? h[11]+'<br>' : '')+(h[12] ? h[12]+'<br>' : '')+(h[13] ? h[13]+'<br>' : '')+(h[14] ? h[14]+'<br>' : '')+h[4]+'</small></td>'+
                        '<td>'+h[2]+'</td>'+
                        '<td>TBA</td>'+
                        '<td>'+h[3]+'</td>'+
                        '<td>'+(houseT[h[5]] ? houseT[h[5]] : '')+'</td>'+
                        '<td>'+h[18]+'</td>'+
                        '<td>'+h[19]+'</td>'+
                        '<td>'+h[20]+'%</td>'+
                    '</tr>'
    })
    retHTML+= '</table>';
    return retHTML;
}

var makeTable = function(data){
   /* Formatting function for row details - modify as you need */
    var tableData = [];
    for(var k in data){
        tableData.push({
            Postcode:k,
            NumberOfRecords:Math.round(data[k].data.length),
            AveragePrice:Math.round(data[k].prices.averagePrice),
            AverageNumberOfHabRooms:Math.round(data[k].prices.averageHabRoom),
            AverageFloorArea:Math.round(data[k].prices.averageArea),
            AveragePerHabRoom:Math.round(data[k].prices.averagePricePerHabRoom1),
            MedianPerHabRoom:Math.round(data[k].prices.medianPricePerHabRoom),
            AveragePerFloorArea:Math.round(data[k].prices.averagePricePerAreaRoom1),
            MedianPerFloorArea:Math.round(data[k].prices.medianPricePerArea),
            Data:data[k].data,
            ID:k,
            Row_id: k.replace(' ','_')
        })
    }
    // $(document).ready(function() {
    table = $('#dataTable').DataTable( {
        "destroy": true,
        "data" : tableData,
        "rowId" : "Row_id",
        "columns": [
            {
                "className":      'details-control',
                "orderable":      false,
                "data":           null,
                "defaultContent": ''
            },
            { "data": "Postcode" },
            { "data": "NumberOfRecords" },
            { "data": "AveragePrice" },
            { "data": "AverageNumberOfHabRooms" },
            { "data": "AverageFloorArea" },
            { "data": "AveragePerHabRoom" },
            { "data": "MedianPerHabRoom" },
            { "data": "AveragePerFloorArea" },
            { "data": "MedianPerFloorArea" }
        ],
        "paging": false,
        "order": [[1, 'asc']]
    } );
    $('div.dataTables_filter input').addClass('form-control');
    // Add event listener for opening and closing details
    $('#dataTable tbody').on('click', 'td.details-control', function () {
        var tr = $(this).closest('tr');
        var row = table.row( tr );

        if ( row.child.isShown() ) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
            polys.map(function(x){x.setOptions({strokeOpacity: 0.5, fillOpacity: 0.35})});
            var containingBounds = containingPoly.getBounds();
            map.panTo(containingBounds.getCenter());
            map.fitBounds(containingBounds);
        }
        else {
            // Open this row
            row.child( formatTable(row.data(), true) ).show();
            tr.addClass('shown');
        }
    } );
    // } ); 
}

var infoWindows = [];
var findPolys = function(e){
    var found = [];
    table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
        table.row( rowIdx ).child.hide();
        $(table.row( rowIdx )).removeClass('shown');
        $(table.row( rowIdx )).show();
    })
    $.fn.dataTable.ext.search.pop();
    table.draw();

    infoWindows.forEach(function(o,i){
        o.setMap(null);
    })
    infoWindows = [];

    polys.map(function(x){
        x.setOptions({strokeOpacity: 0.5, fillOpacity: 0.15});
        if(x.getBounds().contains(e.latLng)){
            found.push(x.pid);
            infoWindows.push(
                new google.maps.InfoWindow({
                    content: "<a href='#"+x.pid.replace(' ','_')+"'>"+x.pid+"</a>",
                    position: x.getBounds().getCenter()
                })
            )
            x.setOptions({strokeOpacity: 1, fillOpacity: 0.75, zIndex:1000});
        }
    });

    infoWindows.forEach(function(o,i){
        o.open(map);
    })

    if(found.length == 0){
        polys.map(function(x){x.setOptions({strokeOpacity: 0.5, fillOpacity: 0.35})});       
    }else{
        var tData = table.data();
        $.fn.dataTable.ext.search.push(
            function(settings, data, dataIndex) {
                return found.includes(tData[dataIndex].ID);
            }
        );
        table.draw();
    }
    

}

$(document).ready(function(){
     $('#findPostcode').click(function(){
        getData()
        .then(function(){
            calcPrices(currData);
        })
        .then(function(){
            makePolys(currData);
        })
        .then(function(retData){
            makeFilters(currData)
            makeTable(currData)
        })
     })

     $('#applyFilters').click(function(){
         applyFilters();
     })
})