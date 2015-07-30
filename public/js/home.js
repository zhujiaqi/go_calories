$(function() {

  delay = (function(){
    var timer = 0;
    return function(callback, ms){
      clearTimeout(timer);
      timer = setTimeout(callback, ms);
    };
  })();

  search = function(e){
    var q = $("#searchterm").val();
    if(!q) {
      return false;
    }
    $.getJSON("/query/" + q,
    function(data) {
      $("#results").empty();
      $("#results").append("<p>搜索 <b>" + q + "</b> 的结果：</p>");
      $.each(data.Items, function(i, item){
        if (item.alters[0]) {
          $("#results").append("<div><h3>" + item.name +" 又名" + item.alters + "</h3>");
        } else {
          $("#results").append("<div><h3>" + item.name + "</h3>");
        }
        $("#results").append("<table>");
        $.each(item.values, function(i, value){
          if(value[1] !== '一') {
            $("#results").append("<tr><th>" + value[0] +"</th><td>" + value[1] + "</td></tr>");
          }
        });
        $("#results").append("</table>");
        $("#results").append("</div>");
      });
      $("#results").append("<hr><p>命中单词：</p>");
      $.each(data.HitWords, function(i,name){
        $("#results").append("<div>" + name +"</div>");
      });
    });
  }
  $("#searchterm").keyup(function(){
    delay(search, 200);
  });
  $("#search").click(function(){
    delay(search, 200);
  });
});
