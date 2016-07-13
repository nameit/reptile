var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');

/* 精心挑选的种子URL——如何精心是个问题 */
var originalURL = [
        'http://movie.douban.com/subject/1292052/', /* 《肖申克的救赎》 */
        'http://movie.douban.com/subject/11026735/',  /* 《超能陆战队》 */
        'http://movie.douban.com/subject/3993588/'  /* 《狼图腾》 */
    ];

var option = {
    targetNumber: 10,  /* 预期的爬取页面数 */
    fileNames: {
        crawled: 'urlCrawled.txt',  /* 每次爬取到一个页面，就将其URL保存到该文件中 */
        allURLsFound: 'allURLsFound.txt'  /* 用于保存所有已知的URL */
    }
};
/* 数据记录 */
var urlDic  = {};
var data = {
    urlListAll: [],  /* 要爬取的连接数 */
    urlListCrawled: [],  /* 已爬链接 */
    countUrlCrawled: 0  /* 已爬链接数目 */
};
 
/* 传入一个可能带有参数字符串的链接，返回一个无参数的链接 */
var Tools = {};
Tools.getUrl = function(href){
    var index = href.indexOf('?');
    var url = href;
    if (index > -1) {
        url = href.substring(0, index);
    }
    return url;
};
Tools.getNumbersOfUrl = function(href){
    var pattern = /\d+/;
    var numbers = pattern.exec(href);
    return numbers;
}
 
/* 每爬取到一个页面，将其URL附加到一个txt文件中 */
Tools.saveCrawled = function(url){
    data.countUrlCrawled++;
    data.urlListCrawled.push(url);
    fs.appendFile(option.fileNames.crawled, url + '\r\n', function (err) {
        if (err) throw err;
    });
};
 
/* 在爬虫程序结束后，把爬取到的页面的URL写入文件 */
Tools.exitCrawler = function(){
    process.exit();
};
 
/* 根据传入的url，获取该页面，并提取该页面中的类似URL地址并去重 */
fetchNextURLs = function(url){
    request({
        url: url,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36'
        }
    }, function (error, response, body) {
        if (error) {
            return console.error(error);
        }
        console.log(url)
        Tools.saveCrawled(url);

        console.log('成功爬取到页面： ' + url );
        console.log('已爬页面数 = '+ data.countUrlCrawled );

        var $ = cheerio.load(response.body.toString());

        /* 保存当前页面 */
        var numbers = Tools.getNumbersOfUrl(url);
        var htmlStream = fs.WriteStream('./douban_movies_html/movie'+numbers + '.html');
        htmlStream.write(body);
        htmlStream.end();
 
        /* 获取当前页面包含的所有URL，去重后放入hrefs列表 */
        var hrefs = [];
        $('#recommendations dt a').each(function(){
            var $me = $(this);
            var href = Tools.getUrl( $me.attr('href') );
            var numbers = Tools.getNumbersOfUrl(href);
            if(!urlDic[numbers]){
                urlDic[numbers] = true;
                hrefs.push(href);
                fs.appendFile(option.fileNames.allURLsFound, href+ '\r\n', function (err) {
                    if (err) throw err;
                });
            }
        });
        /* hrefs的长度为0，表明无法继续查找新的链接了，因此不再递归 */
        if(hrefs.length === 0){
            console.log('本页面未能爬取到新链接。');
        }else{
            data.urlListAll = data.urlListAll.concat(hrefs);
            /* 如果没有超过预定值，则继续进行请求 */
            if(data.countUrlCrawled < option.targetNumber){
                for (var i = 0; i < hrefs.length; i++) {
                    fetchNextURLs(hrefs[i]);
                }
            }else{
                console.log('爬取到的页面数目已达到预期值...');
                Tools.exitCrawler();
            }
        }       
    });
};

/* 根据种子URL启动爬虫 */
for (var i = 0; i < originalURL.length; i++) {
    fetchNextURLs(originalURL[i]);
}