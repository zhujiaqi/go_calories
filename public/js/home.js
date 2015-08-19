$(function() {
  $('.home .submit').on('tap', function() {
    var search = $.trim($('.search-input').val());
    if (search) {
      location.href = '/search/' + encodeURIComponent(search);
    }
  });
  $('.recommend').on('tap', '.td', function() {
    var self = $(this);
    if (self.hasClass('col1')) {
      location.href = "http://www.lovepurejoy.com/product/purejoy?fromCal";
    }
    if (self.hasClass('col2')) {
      location.href = "http://www.lovepurejoy.com/product/meal?fromCal";
    }
    if (self.hasClass('col3')) {
      location.href = "http://www.lovepurejoy.com/product/detox?fromCal";
    }
  });
  var item_tpl = _.template($('#item_tpl').html() || '');
  var hitword_tpl = _.template($('#hitword_tpl').html() || '');
  var cals = [];
  var $detailPage = $('.detail-page');
  var $detail = $('#results');
  var $hitWords = $('.hit-words-tbody');
  var detailsData;

  var delay = (function(){
    var timer = 0;
    return function(callback, ms){
      clearTimeout(timer);
      timer = setTimeout(callback, ms);
    };
  })();

  var search = function(e){
    var q = $.trim($("#searchterm").val());
    if(!q) {
      return false;
    }
    $.getJSON("/query/" + q,
    function(data) {
      detailsData = data.Items;
      $detail.empty();
      data.hitwords = [];
      /*
      _.each(data.HitWords, function(w, i) {
        console.log(w,i, data.Items[i]);
        var cal = data.Items[i].values[0][1];
        data.hitwords.push({
          'name': w,
          'cal': cal
        });
      });
      */
      _.each(data.Items, function(item, i) {
        var cal = item.values[0][1];
        data.hitwords.push({
          'name': item.name + (item.alters[0] ? ('，又名' + item.alters.join('，')) : ''),
          'cal': cal
        });
      });
      $hitWords.empty().append(hitword_tpl({
        hitwords: data.hitwords
      }));
    });
  };

  var showDetail = function(index) {
    $detailPage.find('.detail-name').html(detailsData[index]['name']);
    var data = [];
    _.each(detailsData[index]['values'], function(v, i) {
      var match = v[0].match(/^(.*)\((.*)\)$/);
      var cal = v[1];
      if (match) {
        var name = match[1];
        var base = match[2];
        var val;
        if (cal == '一') {
          val = cal;
        } else {
          val = cal + trans(base);
        }
        if (i == 0) {
          var kj = (cal * 4.184).toFixed(2);
          val = '<span>' + cal + '</span> 大卡<br><span>' + kj + '</span> 千焦';
        }
        data.push({
          'name': name,
          'val': val
        });
      } else {
      }
    });
    $detail.html(item_tpl({item: data}));
    $detailPage.removeClass('hidden');
  };
  $("#searchterm").keyup(function(){
    delay(search, 200);
  });
  $("#search").on('tap', function(){
    delay(search, 200);
  });
  if (item_tpl) {
    search();
  }
  $('.hit-words-table').on('tap', 'tr.body', function() {
    var self = $(this);
    var index = self.data('index');
    showDetail(index);
  });
  $detailPage.on('tap', '.header-left', function() {
    $detailPage.addClass('hidden');
  });
  function trans(base) {
    switch (base) {
      case '克':
        return 'g';
      case '微克':
        return 'μg';
      case '毫克':
        return 'mg';
      case '大卡':
        return '大卡';
      default:
        return '';
    }
  }
});
