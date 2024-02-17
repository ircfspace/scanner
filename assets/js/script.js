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
                document.getElementById('test-no').innerText = `#${testNo}`;
                document.getElementById('ip-no').innerText = ip;
                document.getElementById('ip-no').style = `color: green`;
                document.getElementById('ip-try').innerText = ch;
            } else {
                document.getElementById('test-no').innerText = `#${testNo}`;
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
            const tableRows = sortedArr.map((obj, key) => { return `<tr><td>${(key+1)}</td><td class="copyItem" onclick="copyToClipboard('${obj.ip}')">${obj.ip}</td><td>${numberWithCommas(obj.time)} <small>میلی‌ثانیه</small></td></tr>` }).join('\n');
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
            '172.67.70.',
            '172.67.71.',
            '172.67.68.',
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

function getIpInfo(entry) {
    let ipInfo = [];
    ipInfo['ip'] = '127.0.0.1';
    ipInfo['countryCode'] = 'نامشخص';
    ipInfo['providerCode'] = 'unk';
    ipInfo['providerName'] = '';
    ipInfo['isProxy'] = false;
    try {
        //$('#providerName').html('<img src="../scanner/assets/img/loader.gif" alt="loader" />');
        $.ajax({
            //url: "https://ipinfo.io/"+entry+"/org?token=86b604fe21f759",
            url: "https://geo.ipify.org/api/v2/country?apiKey=at_VLfGVVvN310RgvR9guBL17sPrSLPS&ipAddress="+entry,
            type: 'GET',
            dataType: 'json',
            async:true,
            success: function (data){
                if ( data !== '' ) {
                    // https://bgp.he.net/country/IR
                    ipInfo['ip'] = data['ip'];
                    ipInfo['countryCode'] = data['location']['country\n'];
                    ipInfo['isProxy'] = false;
                    if ( data['isp'].includes('Hetzner Online GMBH') ) {
                        ipInfo['providerCode'] = 'unk';
                        ipInfo['providerName'] = '';
                        ipInfo['isProxy'] = true;
                    }
                    else if ( data['isp'].includes('Mobin Net Communication Company') ) {
                        ipInfo['providerCode'] = 'mbn';
                        ipInfo['providerName'] = 'مبین‌نت';
                    }
                    else if ( data['isp'].includes('Andishe SABZ Khazar Co P.j.s') ) {
                        ipInfo['providerCode'] = 'ask';
                        ipInfo['providerName'] = 'اندیشه‌سبز';
                    }
                    else if ( data['isp'].includes('Mobile Communication Company of Iran PLC') ) {
                        ipInfo['providerCode'] = 'mci';
                        ipInfo['providerName'] = 'همراه‌اول';
                    }
                    else if ( data['isp'].includes('Iran Cell Service and Communication Company') ) {
                        ipInfo['providerCode'] = 'mtn';
                        ipInfo['providerName'] = 'ایرانسل';
                    }
                    else if ( data['isp'].includes('Iran Telecommunication Company PJS') ) {
                        ipInfo['providerCode'] = 'mkh';
                        ipInfo['providerName'] = 'مخابرات';
                    }
                    else if ( data['isp'].includes('Rightel Communication Service Company PJS') ) {
                        ipInfo['providerCode'] = 'rtl';
                        ipInfo['providerName'] = 'رایتل';
                    }
                    else if ( data['isp'].includes('Aria Shatel Company Ltd') ) {
                        ipInfo['providerCode'] = 'sht';
                        ipInfo['providerName'] = 'شاتل';
                    }
                    else if ( data['isp'].includes('Pardis Fanvari Partak Ltd') ) {
                        ipInfo['providerCode'] = 'sht';
                        ipInfo['providerName'] = 'شاتل‌موبایل';
                    }
                    else if ( data['isp'].includes('Pars Online PJS') ) {
                        ipInfo['providerCode'] = 'prs';
                        ipInfo['providerName'] = 'پارس‌آنلاین';
                    }
                    else if ( data['isp'].includes('Asiatech Data Transfer Inc PLC') ) {
                        ipInfo['providerCode'] = 'ast';
                        ipInfo['providerName'] = 'آسیاتک';
                    }
                    else if ( data['isp'].includes('Afranet') ) {
                        ipInfo['providerCode'] = 'aft';
                        ipInfo['providerName'] = 'افرانت';
                    }
                    else if ( data['isp'].includes('Respina Networks & Beyond PJSC') ) {
                        ipInfo['providerCode'] = 'rsp';
                        ipInfo['providerName'] = 'رسپینا';
                    }
                    else if ( data['isp'].includes('Rayaneh Danesh Golestan Complex P.J.S. Co.') ) {
                        ipInfo['providerCode'] = 'hwb';
                        ipInfo['providerName'] = 'های‌وب';
                    }
                    else if ( data['isp'].includes('Pishgaman Toseeh Ertebatat Company') ) {
                        ipInfo['providerCode'] = 'psm';
                        ipInfo['providerName'] = 'پیشگامان';
                    }
                    else if ( data['isp'].includes('Farabord Dadeh Haye Iranian Co.') ) {
                        ipInfo['providerCode'] = 'ztl';
                        ipInfo['providerName'] = 'زیتل';
                    }
                    else if ( data['isp'].includes('Tose\'h Fanavari Ertebabat Pasargad Arian Co PJS') ) {
                        ipInfo['providerCode'] = 'arx';
                        ipInfo['providerName'] = 'آراکس';
                    }
                    else if ( data['isp'].includes('Fanava Group') ) {
                        ipInfo['providerCode'] = 'fnv';
                        ipInfo['providerName'] = 'فن‌آوا';
                    }
                    else if ( data['isp'].includes('Negin Ertebatate Ava Company PJS') ) {
                        ipInfo['providerCode'] = 'apt';
                        ipInfo['providerName'] = 'آپتل';
                    }
                    else if ( data['isp'].includes('Didehban Net Company PJS') ) {
                        ipInfo['providerCode'] = 'dbn';
                        ipInfo['providerName'] = 'دیده‌بان‌نت';
                    }
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
            }
        })
    }
    catch(err) {
        console.log(err.message)
    }
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setOptions() {
    $.each(cfIPv4, function(i, p) {
        let totalIp = numberWithCommas(cidrToIpArray(p).length);
        $('#ranges').append($('<option></option>').val((p)).html(p+ ' ('+totalIp+' IP)'));
    });
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('newScan').disabled = false;
}
