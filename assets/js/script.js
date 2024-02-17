function startScan() {
    let num = document.getElementById('download-num').value;
    if ( num < 1 ) {
        num = 1;
    }
    let ping = document.getElementById('max-ping').value;
    if ( ping < 200 ) {
        ping = 200;
    }
    let randomized = document.getElementById('random').checked;
    let beta = document.getElementById('beta').checked;
    let ips = [];
    let preSelect;
    if ( randomized ) {
        preSelect = getMultipleRandomElements(cfIPv4, 10);
    }
    else {
        cfIPv4.sort(function(a,b){return a-b});
        preSelect = cfIPv4.slice(0, 10);
    }
    for (let cidr of preSelect) {
        ips = ips.concat(cidrToIpArray(cidr));
    }
    let selectedIPs = getMultipleRandomElements(ips, num);
    testIPs(selectedIPs, num, ping, beta);
    document.getElementById('scanBtn').disabled = true;
    document.getElementById('newScan').disabled = true;
    document.getElementById('tableResults').classList.remove("hidden");
    document.getElementById('process').classList.remove("hidden");
    document.getElementById('download-text').classList.add("hidden");
    document.getElementById('ranges').disabled = true;
    document.getElementById('download-num').disabled = true;
    document.getElementById('max-ping').disabled = true;
    document.getElementById('random').disabled = true;
    document.getElementById('beta').disabled = true;
    $('input[name="forProvider"]').prop("disabled", true);
    $('#suggestion').addClass('hidden');
}

let testNo = 0;
let validIPs = [];
let testResult = 0;
let provider = "";
async function testIPs(ipList, totalIp, timeout, betaVersion) {
    let prcNo = 0;
    $('#progressBar div').addClass('progress-bar-striped active');
    for (const ip of ipList) {
        testNo++;
        processBar(prcNo, totalIp);
        prcNo++;
        let url = `https://${ip}/__down`;
        if ( betaVersion ) {
            url = `https://${ip}/cdn-cgi/trace`;
        }
        const startTime = performance.now();
        const controller = new AbortController();
        for (const ch of ['...', '..', '.', '..', '...']) {
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, timeout);
            if (ch) {
                document.getElementById('test-no').innerText = `#${translateDigits(testNo)}`;
                document.getElementById('ip-no').innerText = ip;
                document.getElementById('ip-no').style = `color: green`;
                document.getElementById('ip-try').innerText = ch;
            } else {
                document.getElementById('test-no').innerText = `#${translateDigits(testNo)}`;
                document.getElementById('ip-no').innerText = ip;
                document.getElementById('ip-no').style = `color: red`;
                document.getElementById('ip-try').innerText = ch;
            }
            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                });
                testResult++;
            } catch (error) {
                if (error.name === "AbortError") {
                    //
                }
                else {
                    testResult++;
                }
            }
            clearTimeout(timeoutId);
        }
        let duration = performance.now() - startTime;
        duration = Math.floor(duration / 5);
        if ( duration > timeout ) {
            continue;
        }
        if ( betaVersion ) {
            if ( duration <= 200 ) {
                continue;
            }
        }
        if (testResult > 0) {
            validIPs.push({ip: ip, time: duration});
            const uniqueArr = validIPs.reduce((acc, current) => {
                const x = acc.find(item => item.ip === current.ip);
                if (!x) {
                    return acc.concat([current]);
                } else {
                    return acc;
                }
            }, []);
            let sortedArr = uniqueArr.sort((a, b) => a.time - b.time);
            //sortedArr = sortedArr.slice(0, 50);
            const tableRows = sortedArr.map((obj, key) => { return `<tr><td>${translateDigits(key+1)}</td><td class="copyItem" onclick="copyToClipboard('${obj.ip}')">${obj.ip}</td><td>${translateDigits(numberWithCommas(obj.time))} <small>میلی‌ثانیه</small></td></tr>` }).join('\n');
            document.getElementById('result').innerHTML = tableRows;
        }
    }
    if ( testResult > 0 ) {
        let html = 'برای دانلود نتایج <a id="download-link" href="#"><b>اینجا</b></a> کلیک کنید.';
        document.getElementById('download-text').innerHTML = html;
        document.getElementById('download-text').classList.remove("hidden");
    }
    else {
        document.getElementById('download-text').classList.add("hidden");
    }
    document.getElementById('process').classList.add("hidden");
    $('#progressBar div').removeClass('progress-bar-striped active').css('width', '100%');
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('newScan').disabled = false;
    document.getElementById('ranges').disabled = false;
    document.getElementById('download-num').disabled = false;
    document.getElementById('max-ping').disabled = false;
    document.getElementById('random').disabled = false;
    document.getElementById('beta').disabled = false;
    $('input[name="forProvider"]').prop("disabled", false);
}

function newScan() {
    testNo = 0;
    validIPs = [];
    testResult = 0;
    document.getElementById('result').innerHTML = "";
    document.getElementById('download-text').classList.add("hidden");
    document.getElementById('process').classList.add("hidden");
    $('#progressBar div').removeClass('progress-bar-striped active').css('width', '100%');
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('newScan').disabled = false;
    document.getElementById('ranges').disabled = false;
    document.getElementById('download-num').disabled = false;
    document.getElementById('max-ping').disabled = false;
    document.getElementById('random').disabled = false;
    document.getElementById('beta').disabled = false;
    $('input[name="forProvider"]').prop("disabled", false);
    startScan();
}

function cidrToIpArray(cidr) {
    const parts = cidr.split('/');
    const ip = parts[0];
    const mask = parseInt(parts[1], 10);
    const ipParts = ip.split('.');
    const start = (
        (parseInt(ipParts[0], 10) << 24) |
        (parseInt(ipParts[1], 10) << 16) |
        (parseInt(ipParts[2], 10) << 8) |
        parseInt(ipParts[3], 10)
    ) >>> 0;
    const end = (start | (0xffffffff >>> mask)) >>> 0;
    const ips = [];
    for (let i = start; i <= end; i++) {
        const a = (i >> 24) & 0xff;
        const b = (i >> 16) & 0xff;
        const c = (i >> 8) & 0xff;
        const d = i & 0xff;
        ips.push(`${a}.${b}.${c}.${d}`);
    }
    return ips;
}

function processBar(item, total) {
    let percentage = (100 * item) / total;
    if ( percentage < 2 ) {
        percentage = 1;
    }
    if ( percentage > 99 ) {
        percentage = 100;
    }
    $('#progressBar div').css('width', percentage+'%');
}

function getMultipleRandomElements(arr, num) {
    var shuffled = [...arr].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, num)
}

function copyToClipboard(ip) {
    navigator.clipboard.writeText(ip).then(() => {
        //alert('آی‌پی‌ در کلیپ‌بورد کپی شد.');
    }).catch(() => {
        //alert('مشکلی پیش آمده است!');
    });
}

$(document).on('click', '#download-link', function(e) {
    e.preventDefault();
    const csvString = validIPs.map(el => el.ip).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = today.getFullYear();
    let dateTime = yyyy + '-' + mm + '-' + dd;
    link.setAttribute('download', 'ipList-'+(provider === "" ? "UNK" : provider)+'-'+dateTime+'.csv');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

$(document).on('change', '#ranges', function(e) {
    e.preventDefault();
    $('input[name="forProvider"]').prop("checked", false);
    let value = $(this).val();
    if ( value === 'null' || value.includes('all') ) {
        let options = $('#ranges option');
        if ( value.length !== 1 ) {
            $('#ranges option[value="all"]').prop("selected", false).removeAttr("selected");
        }
        cfIPv4 = [];
        for (let i=0; i<options.length; i++){
            let vl = options[i].value;
            if (vl === "") { continue; }
            if (vl === "all") {
                continue;
            }
            if (typeof vl === "null") { continue; }
            cfIPv4.push(vl);
        }
    }
    else {
        $('#ranges option[value="all"]').prop("selected", false).removeAttr("selected");
        cfIPv4 = value;
    }
});

$(document).on('change', '#forMci', function(e) {
    e.preventDefault();
    cfIPv4 = [];
    $('#ranges option[value="all"]').prop("selected", false).removeAttr("selected");
    let options = $('#ranges option');
    for (let i=0; i<options.length; i++){
        let vl = options[i].value;
        if (vl === "") { continue; }
        if (typeof vl === "null") { continue; }
        if ( ! [
            '80.94.83.',
            '104.17.157.',
            '104.18.91.',
            '104.19.205.',
            '104.19.241.',
            '104.21.31.',
            '104.21.71.',
            '104.26.1.',
            '104.193.213.',
            '108.162.194.',
            '172.64.171.',
            '172.67.21.',
            '172.67.34.',
            '172.67.70.',
            '172.67.71.',
            '172.67.68.',
            '172.67.215.',
            '185.59.218.',
            '188.42.89.',
            '188.114.96.',
            '185.18.250.',
            '194.152.44.',
            '198.41.209.',
            '203.23.106.',
            '203.32.121.'
        ].some((word) => vl.startsWith(word)) ) { continue; }
        cfIPv4.push(vl);
    }
});

$(document).on('change', '#forMtn', function(e) {
    e.preventDefault();
    cfIPv4 = [];
    $('#ranges option[value="all"]').prop("selected", false).removeAttr("selected");
    let options = $('#ranges option');
    for (let i=0; i<options.length; i++){
        let vl = options[i].value;
        if (vl === "") { continue; }
        if (typeof vl === "null") { continue; }
        if ( ! [
            '45.85.119.',
            '66.235.200.',
            '104.18.0.',
            '104.18.5.',
            '104.18.21.',
            '104.18.228.',
            '136.244.87.',
            '140.82.57.',
            '172.64.145.',
            '172.64.153.',
            '172.66.2.',
            '192.200.160.'
        ].some((word) => vl.startsWith(word)) ) { continue; }
        cfIPv4.push(vl);
    }
});

/*$(document).on('change', '#forWarp', function(e) {
    e.preventDefault();
    cfIPv4 = [];
    $('#ranges option[value="all"]').prop("selected", false).removeAttr("selected");
    let options = $('#ranges option');
    for (let i=0; i<options.length; i++){
        let vl = options[i].value;
        if (vl === "") { continue; }
        if (typeof vl === "null") { continue; }
        if ( ! ['162.159.', '188.114.'].some((word) => vl.startsWith(word)) ) { continue; }
        cfIPv4.push(vl);
    }
});*/

function getMyIp() {
    /*$.get('http://www.cloudflare.com/cdn-cgi/trace', function(data) {
        data = data.split("\n");
        if ( data.length > 0 ) {
            for (let i=0; i<data.length; i++){
                let item = data[i].split("=");
                if ( item[0] !== 'ip' ) {
                    continue;
                }
                return getIpInfo(item[1]);
            }
        }
    });*/
    $.getJSON('https://api.my-ip.io/ip.json', function(ipData){
        if ( ipData['success'] ) {
            return getIpInfo(ipData['ip']);
        }
    });
}

function getAsnInfo(ip, data) {
    let ipInfo = [];
    ipInfo['ip'] = ip;
    ipInfo['providerCode'] = 'unk';
    ipInfo['providerName'] = '';
    ipInfo['isProxy'] = true;
    // https://bgp.he.net/country/IR
    if ( data.includes('Mobin Net Communication Company') ) {
        ipInfo['providerCode'] = 'mbn';
        ipInfo['providerName'] = 'مبین‌نت';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Andishe SABZ Khazar Co P.j.s') ) {
        ipInfo['providerCode'] = 'ask';
        ipInfo['providerName'] = 'اندیشه‌سبز';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Mobile Communication Company of Iran PLC') ) {
        ipInfo['providerCode'] = 'mci';
        ipInfo['providerName'] = 'همراه‌اول';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Iran Cell Service and Communication Company') ) {
        ipInfo['providerCode'] = 'mtn';
        ipInfo['providerName'] = 'ایرانسل';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Iran Telecommunication Company PJS') ) {
        ipInfo['providerCode'] = 'mkh';
        ipInfo['providerName'] = 'مخابرات';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Rightel Communication Service Company PJS') ) {
        ipInfo['providerCode'] = 'rtl';
        ipInfo['providerName'] = 'رایتل';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Aria Shatel Company Ltd') ) {
        ipInfo['providerCode'] = 'sht';
        ipInfo['providerName'] = 'شاتل';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Pardis Fanvari Partak Ltd') ) {
        ipInfo['providerCode'] = 'sht';
        ipInfo['providerName'] = 'شاتل‌موبایل';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Pars Online PJS') ) {
        ipInfo['providerCode'] = 'prs';
        ipInfo['providerName'] = 'پارس‌آنلاین';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Asiatech Data Transfer Inc PLC') ) {
        ipInfo['providerCode'] = 'ast';
        ipInfo['providerName'] = 'آسیاتک';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Afranet') ) {
        ipInfo['providerCode'] = 'aft';
        ipInfo['providerName'] = 'افرانت';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Respina Networks & Beyond PJSC') ) {
        ipInfo['providerCode'] = 'rsp';
        ipInfo['providerName'] = 'رسپینا';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Rayaneh Danesh Golestan Complex P.J.S. Co.') ) {
        ipInfo['providerCode'] = 'hwb';
        ipInfo['providerName'] = 'های‌وب';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Pishgaman Toseeh Ertebatat Company') ) {
        ipInfo['providerCode'] = 'psm';
        ipInfo['providerName'] = 'پیشگامان';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Farabord Dadeh Haye Iranian Co.') ) {
        ipInfo['providerCode'] = 'ztl';
        ipInfo['providerName'] = 'زیتل';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Tose\'h Fanavari Ertebabat Pasargad Arian Co PJS') ) {
        ipInfo['providerCode'] = 'arx';
        ipInfo['providerName'] = 'آراکس';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Fanava Group') ) {
        ipInfo['providerCode'] = 'fnv';
        ipInfo['providerName'] = 'فن‌آوا';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Negin Ertebatate Ava Company PJS') ) {
        ipInfo['providerCode'] = 'apt';
        ipInfo['providerName'] = 'آپتل';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Didehban Net Company PJS') ) {
        ipInfo['providerCode'] = 'dbn';
        ipInfo['providerName'] = 'دیده‌بان‌نت';
        ipInfo['isProxy'] = false;
    }
    else if ( data.includes('Pardazeshgar Ray AZMA Co Ltd') ) {
        ipInfo['providerCode'] = 'ryn';
        ipInfo['providerName'] = 'رای‌نت';
        ipInfo['isProxy'] = false;
    }
    getCleanIp(ipInfo['providerCode'], ipInfo['providerName']);
    return ipInfo;
}

function getCleanIp(provider, title) {
    if ( provider === '' || provider === 'unk' || typeof provider === 'undefined' ) {
        return;
    }
    let inArr = [ provider ];
    if ( provider === 'irc' || provider === 'mtn' ) {
        inArr = [ "irc", "mtn" ];
    }
    if ( provider === 'mkb' || provider === 'mkh' ) {
        inArr = [ "mkb", "mkh" ];
    }
    jQuery.get('https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.json?v1.'+Date.now(), function(data) {
        data = JSON.parse(data);
        $i = 0;
        let ipList = "<span>آی‌پی‌های پیشنهادی برای "+title+" <small>(" +provider.toUpperCase()+")</small></span>";
        ipList += "<div class='clearfix'></div>";
        jQuery.each(data['ipv4'], function(index, item) {
            if ( inArr.includes(item.operator.toLowerCase()) ) {
                if ( $i !== 0 ) {
                    ipList += "\n";
                }
                if ( $i <= 3 ) {
                    ipList += '<div class="label label-primary copyItem" onclick=copyToClipboard("'+item.ip+'")>'+item.ip+'</div>';
                }
                $i++;
            }
        });
        ipList += '<a href="https://ircfspace.github.io/tester/" target="_blank" class="label label-default">بیشتر</a>';
        $('#suggestion').html(ipList).removeClass('hidden');
    });
}

function getIpInfo(entry) {
    let ipInfo = [];
    ipInfo['ip'] = '127.0.0.1';
    ipInfo['providerCode'] = 'unk';
    ipInfo['providerName'] = '';
    ipInfo['isProxy'] = false;
    try {
        //$('#providerName').html('<img src="../scanner/assets/img/loader.gif" alt="loader" />');
        $.get("https://ipinfo.io/"+entry+"/org?token=86b604fe21f759", function(data, status) {
            if ( data !== '' ) {
                ipInfo = getAsnInfo(entry, data);
            }
            provider = ipInfo['providerCode'];
            $('#providerName').html(ipInfo['providerName'].toUpperCase());
            $('#proxyChecker').html('علاوه‌براین، '+(ipInfo['isProxy'] ? 'درحال‌حاضر قندشکن شما روشن است؛ باید ‌آن‌را خاموش کنید' : 'باید قندشکن شما خاموش باشد')+'.');
            if ( ipInfo['isProxy'] ) {
                $('#alert').removeClass('alert-warning').addClass('alert-danger');
            }
            else {
                $('#alert').removeClass('alert-danger').addClass('alert-warning');
            }
            return ipInfo;
        });
    }
    catch(err) {
        console.log(err.message)
    }
}

function strReplace(search, replace, subject, count) {
    let i = 0,
        j = 0,
        temp = '',
        repl = '',
        sl = 0,
        fl = 0,
        f = [].concat(search),
        r = [].concat(replace),
        s = subject,
        ra = Object.prototype.toString.call(r) === '[object Array]',
        sa = Object.prototype.toString.call(s) === '[object Array]';
    s = [].concat(s);
    if (count) {
        this.window[count] = 0;
    }
    for (i = 0, sl = s.length; i < sl; i++) {
        if (s[i] === '') {
            continue;
        }
        for (j = 0, fl = f.length; j < fl; j++) {
            temp = s[i] + '';
            repl = ra ? (r[j] !== undefined ? r[j] : '') : r[0];
            s[i] = (temp)
                .split(f[j])
                .join(repl);
            if (count && s[i] !== temp) {
                this.window[count] += (temp.length - s[i].length) / f[j].length;
            }
        }
    }
    return sa ? s : s[0];
}
function translateDigits(string, to) {
    if (typeof(to) === 'undefined') to = 'fa';
    let persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (to === 'en') {
        return strReplace(persianDigits, englishDigits, string);
    }
    return strReplace(englishDigits, persianDigits, string);
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getRanges() {
    try {
        jQuery.get(siteUrl+'ipv4.list?v1.12', function(data) {
            cfIPv4 = data.split("\n");
            setOptions(cfIPv4);
        });
    }
    catch(err) {
        console.log(err);
    }
}

function setOptions(data) {
    $.each(data, function(i, p) {
        if ( p !== '' ) {
            let totalIp = numberWithCommas(cidrToIpArray(p).length);
            $('#ranges').append($('<option></option>').val((p)).html(p+ ' ('+totalIp+' IP)'));
        }
    });
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('newScan').disabled = false;
}
