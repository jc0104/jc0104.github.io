/^http(s*):\/\//.test(location.href) || alert('请先部署到 localhost 下再访问');
var host = window.location.host
var protocol = window.location.protocol;
var web_url = protocol + "//" + host + "/";
//初始化页面加载公共css样式
var initCss = [
    "public/style/public.css",
    "public/layui/layui/css/layui.css",
    "public/style/icons/font-awesome.min.css"
];
//初始化页面加载公共js脚本
var initScripts = [
    "public/sysinfo.js",
    "public/jquery/require/require.min.js",
    "public/layui/layui/layui.js"
];
//****************************************************************************************************************************************************
//页面加载-开始
//----------------------------------------------------------------------------------------------------------------------------------------------------
var loadPage = function (callback) {
    var newCss = mergeUnique(initCss, css)
    loadCSS(newCss, 'system-styles', function () {
        console.log("所有css样式已加载完成！");
    });
    var newScripts = mergeUnique(initScripts, scripts)
    loadJS(newScripts, function () {
        console.log("所有js脚本已加载完成！");
        if (typeof callback === 'function') callback();
        document.title = SN;
    }, 1);
}
//----------------------------------------------------------------------------------------------------------------------------------------------------
//页面加载-结束
//****************************************************************************************************************************************************
//****************************************************************************************************************************************************
//动态加载js脚本-开始
//----------------------------------------------------------------------------------------------------------------------------------------------------
var scripts = [];//js脚本文件数组,路径相对于根目录开始不加/
//调用入口
var loadJS = function (scripts, callback, loadJStype) {
    if (loadJStype == 1) {//方式一、递归顺序加载JS（确保顺序）
        loadScriptsSequentially(scripts, callback)
    }
    if (loadJStype == 2) {//方式二、并行加载js + 顺序执行（推荐）
        loadScriptsParallel(scripts, callback)
    }
}
/* 调用示例
 scripts = [
     "public/test1.js",
     "public/test2.js"
 ];
 loadJS(scripts, function() {
     a();
     b();
 },1);
*/
//----------------------------------------------------------------------------------------------------------------------------------------------------
//方式一、递归顺序加载JS（确保顺序）
var loadScriptsSequentially = function (scripts, callback) {
    var index = 0;
    function loadNext() {
        if (index >= scripts.length) {
            if (typeof callback === 'function') callback();
            return;
        }
        $.getScript(web_url + scripts[index])
            .done(function () {
                console.log("js脚本加载成功: " + scripts[index]);
                index++;
                loadNext(); // 加载下一个
            })
            .fail(function () {
                console.error("js脚本加载失败: " + scripts[index]);
                index++;
                loadNext(); // 即使失败也继续加载后续文件
            });
    }
    loadNext(); // 开始加载
}
//----------------------------------------------------------------------------------------------------------------------------------------------------
//方式二、并行加载js + 顺序执行（推荐）
var loadScriptsParallel = function (scripts, callback) {
    var deferreds = [];
    // 1. 并行加载所有脚本
    $.each(scripts, function (i, src) {
        deferreds.push(
            $.ajax({
                url: web_url + src,
                dataType: "script",
                timeout: 5000, // 5秒超时
                cache: true // 利用浏览器缓存
            })
        );
    });
    // 2. 等待所有加载完成
    $.when.apply($, deferreds)
        .done(function () {
            if (typeof callback === 'function') callback();
        })
        .fail(function (jqXHR) {
            console.error("js脚本加载失败: ", $(jqXHR.responseText).filter('pre').text() || $(jqXHR.responseText).find('pre').text());
        });
}
//----------------------------------------------------------------------------------------------------------------------------------------------------
//动态加载js脚本-结束
//****************************************************************************************************************************************************
//****************************************************************************************************************************************************
//动态加载css-开始
//----------------------------------------------------------------------------------------------------------------------------------------------------
var css = [];//css样式文件数组,路径相对于根目录开始不加/
//调用入口
var loadCSS = function (css, themeId, callback) {
    // 移除之前加载的主题CSS
    $('link[data-dynamic-theme]').remove();
    // 创建加载状态元素
    css.forEach(function (cssUrl, index) {
        // 创建link元素加载CSS
        $('<link>', {
            id: themeId,
            rel: 'stylesheet',
            type: 'text/css',
            href: web_url + cssUrl,
            'data-dynamic-theme': themeId + "-" + index
        })
            .appendTo('head')
            .on('load', function () {
                console.log("css样式加载成功: ", cssUrl);
                if ((index + 1) >= css.length) {
                    if (typeof callback === 'function') callback();
                }
            })
            .on('error', function () {
                console.error("css样式加载失败: ", cssUrl);
                if ((index + 1) >= css.length) {
                    if (typeof callback === 'function') callback();
                }
            });
    });
}
/* 调用示例
 css=[
     "test/test11.css",
     "test/test2.css"];
 loadCSS(css, 'test-styles', function () {
     console.log("所有css样式已加载完成！");
 });
*/
//----------------------------------------------------------------------------------------------------------------------------------------------------
//动态加载css-结束
//****************************************************************************************************************************************************
//****************************************************************************************************************************************************
//加载echarts图表-开始
//----------------------------------------------------------------------------------------------------------------------------------------------------
//调用入口
/*  
    echarts,    echarts对象
    echartsSetInfo
        version，   echarts版本
        epaths,     echarts脚本文件路径（可以多个）（格式:{版本名：路径}，如：{ 'echarts.5.5.0': 'public/echarts/echarts.5.5.0' ,……}）
        eDivID,     echarts展示所在div的ID
        setAPI,     获取echarts配置信息接口信息，格式：{ "url": "", "params": null, "type": "get", "IsAsync": true }
            url     api地址
            params  api入参{}
            type    api请求类型（为空默认为post）
            IsAsync api是否异步请求（为空默认为false）
        dataAPI,    获取echarts数据接口信息，格式：{ "url": "", "params": null, "type": "get", "IsAsync": true }
            url     api地址
            params  api入参{}
            type    api请求类型（为空默认为post）
            IsAsync api是否异步请求（为空默认为false）
        dNames,     数据字段名称数组（如：['name', 'value', 'value1', 'value2']），
                    第一个留给xAxis（默认）或yAxis（需要在oCallback回调方法更改）
        snList      series.name数组（如：['示例1', '示例2', '示例3']）和echarts对象legend的data保持一致
        stList,     series.type数组（如：['bar', 'line', 'bar']）
    oCallback,  option赋值完后的回调方法 （多用于对option中的各个属性进行补充扩展）
    eCallback   echarts对象加载完后的回调方法（多用于对myChart的补充扩展，例如添加点击事件）
*/
var showEcharts = function (echartsSetInfo, oCallback, eCallback) {
    try {
        var version = echartsSetInfo.version;
        var epaths = echartsSetInfo.epaths;
        var eDivID = echartsSetInfo.eDivID;

        var setAPI = echartsSetInfo.setAPI;
        var dataAPI = echartsSetInfo.dataAPI;

        var dNames = echartsSetInfo.dNames;
        var snList = echartsSetInfo.snList;
        var stList = echartsSetInfo.stList;

        require.config({
            paths: epaths
        });

        require(['echarts.' + version], function (echarts) {
            getEchartsSet(setAPI, function (setData) {
                getEchartsData(dataAPI, setData, function (option, data) {
                    var dList = Array.from({ length: dNames.length }, () => []);
                    for (var i = 0; i < data.length; i++) {
                        for (var n = 0; n < dNames.length; n++) {
                            dList[n].push(data[i][dNames[n]]);
                        }
                    }
                    try { option.legend[0].data = (IsNull(snList) == "" ? dList[0] : snList); } catch (e) { }
                    try { option.xAxis[0].data = dList[0]; } catch (e) { }

                    for (var i = 0; i < stList.length; i++) {
                        if (typeof option.series[i] !== 'undefined' && option.series[i] !== null) {
                            option.series[i].name = snList[i];
                            option.series[i].type = stList[i];
                            if (stList[i] == "pie") {
                                option.series[i].data = dList[0].map(function (name, index) {
                                    return {
                                        value: dList[i + 1][index],
                                        name: name
                                    };
                                });
                            }
                            else {
                                option.series[i].data = dList[i + 1];
                            }
                        } else {
                            var seriess = JSON.parse(JSON.stringify(option.series[0]));
                            option.series.push(seriess);
                            option.series[i].name = snList[i];
                            option.series[i].type = stList[i];
                            if (stList[i] == "pie") {
                                option.series[i].data = dList[0].map(function (name, index) {
                                    return {
                                        value: dList[i + 1][index],
                                        name: name
                                    };
                                });
                            }
                            else {
                                option.series[i].data = dList[i + 1];
                            }
                        }
                    }
                    option.version = "ECharts." + echarts.version
                    if (typeof oCallback === 'function') oCallback(option);

                    console.log(option);

                    var myChart = echarts.init(document.getElementById(eDivID));
                    myChart.dispose();
                    myChart.clear();
                    myChart = echarts.init(document.getElementById(eDivID));
                    myChart.setOption(option, true);

                    if (typeof eCallback === 'function') eCallback(myChart);

                    $(window).resize(function () {
                        myChart.resize();
                    });
                })
            });
        });
    } catch (e) {
        alert(e)
    }
}
//----------------------------------------------------------------------------------------------------------------------------------------------------
//获取echarts图表设置信息
var getEchartsSet = function name(setAPI, callback) {
    jQuery.support.cors = true;
    $.ajax({
        cache: false,
        type: (setAPI.type == "" ? "POST" : setAPI.type),
        async: ((IsNull(setAPI.IsAsync) === false || IsNull(setAPI.IsAsync) == "") ? false : true),
        url: setAPI.url,
        data: JSON.stringify(setAPI.params),
        dataType: "json",
        contentType: "application/json;charset=utf-8",
        success: function (setData) {
            if (typeof callback === 'function') callback(setData);
        },
        error: function (xhr, status, err) {
            console.error("加载失败:", status, err);
        }
    });
}
//----------------------------------------------------------------------------------------------------------------------------------------------------
//获取echarts图表展现数据
var getEchartsData = function name(dataAPI, setData,callback) {
    jQuery.support.cors = true;
    $.ajax({
        cache: false,
        type: (dataAPI.type == "" ? "POST" : dataAPI.type),
        async: ((IsNull(dataAPI.IsAsync) === false || IsNull(dataAPI.IsAsync) == "") ? false : true),
        url: dataAPI.url,
        data: JSON.stringify(dataAPI.params),
        dataType: "json",
        contentType: "application/json;charset=utf-8",
        success: function (data) {
            if (typeof callback === 'function') callback(setData, data);
        },
        error: function (xhr, status, err) {
            console.error("加载失败:", status, err);
        }
    });
}
/* 调用示例
showEcharts({
        "epaths": { 'echarts.5.5.0': web_url + 'public/echarts/echarts.5.5.0' },
        "version": "5.5.0",
        "eDivID": "eDiv1",
        "setAPI": { "url": web_url + "data/echarts/base/1.json", "params": null, "type": "get", "IsAsync": true },
        "dataAPI": { "url": web_url + "data/echarts/data/bar/bar_1_data.json", "params": null, "type": "get", "IsAsync": true },
        "dNames": ['name', 'value'],
        "snList": [],
        "stList": ['bar']
    },
    function (option) {
        option.xAxis[0].show = true
        console.log(option);
    },
    function (myChart) {
        myChart.on('click', (params) => {
            console.log(params);
            alert(params.name + "\r\n" + params.value)
        })
    }
)
*/
//----------------------------------------------------------------------------------------------------------------------------------------------------
//加载echarts图表-结束
//****************************************************************************************************************************************************
//****************************************************************************************************************************************************
//多个一维数组合并去重-开始
//----------------------------------------------------------------------------------------------------------------------------------------------------
var mergeUnique = function (...arrays) {
    const merged = [].concat(...arrays);
    try {
        return [...new Set(merged)]; // ES6 方式
    } catch (error) {
        // 或兼容旧版: 
        return merged.filter((v, i) => merged.indexOf(v) === i);
    }
}
//----------------------------------------------------------------------------------------------------------------------------------------------------
//多个一维数组合并去重-结束
//****************************************************************************************************************************************************
//****************************************************************************************************************************************************
//校验验证-开始
//----------------------------------------------------------------------------------------------------------------------------------------------------
//判断字符串是否为空或null或undefined，是返回"",否返回原字符串
function IsNull(Stra) {
    var Strb = Stra;
    try {
        if (Strb == null || Strb == "null" || Stra == "undefined" || typeof (Stra) == "undefined") {
            Strb = "";
        }
    } catch (e) {
        Strb = "";
    }
    return Strb;
}
//----------------------------------------------------------------------------------------------------------------------------------------------------
//校验验证-结束
//****************************************************************************************************************************************************




//****************************************************************************************************************************************************
//XXXXX-开始
//----------------------------------------------------------------------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------------------------------------------------------------------
//XXXXX-结束
//****************************************************************************************************************************************************