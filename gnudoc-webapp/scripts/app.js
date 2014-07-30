var util = require("util");
var $ = require("jquery-browserify");
var clickHistory = [];

$(window).on("popstate", function (){
  var target = document.location.pathname;
  if (target == "/") {
    $("#viewer").addClass("hidden");
    $("#contents").removeClass("hidden");
  }
  else {
    docGet (target);
  }
});

function docGet (target) {
  var resource = util.format("/manual/elisp/%s", target);
  $.ajax(resource, {
    dataType: "html",
    error: function () {
      alert(util.format("something went wrong getting %s", resource));
    },
    success: function (data) { 
      var newData = data.replace(
        "<body>", "<body><div class=\"doc\" id=\"body\">"
      ).replace(
        '</body>','</div></body>'
      );
      var body = $("<div class=\"display: none;\"></div>").html(newData).find("#body");
      $("#contents").addClass("hidden");
      $("#viewer").removeClass("hidden");
      $("#viewer").empty().html(body);
      clickHistory.push(target);
      aReplace("#viewer a");
    }
  });
}

function docClick (evt) {
  var target = $(evt.target).attr("ref").split(" ");
  history.pushState({}, "", target);
  docGet(target[0]);
  return false;
}

// replace all the A hrefs in a section
function aReplace (selector) {
  console.log(util.format("aReplace called on %s", selector));
  $(selector).each(function (i, e) {
    var el = $(e);
    var href = el.attr("href");
    el.attr("href", "#");
    el.attr("ref", href);
  });
  $(selector).click(function (evt) { return docClick (evt); });
}

$("#index").load(
  "/manual/elisp/index.html #content", 
  function () {
    console.log("content is loaded!");
    var docTables = $("#index table");
    // If we use the tr we could possibly get the 2nd TD, a long description
    var hrefs = $("tr", docTables.get(0)).map(
      function (i, e) { 
        var a = $("a", e);
        return { "href": a.attr("href"), "text": a.text() };
      }
    ).get();
    // TODO: could add the parsed hrefs to a DOM node or to a global
    // object or some object we decorate as we go through the call
    // chain
    $("#contents").html(
      $(hrefs).map(function (i, e) {
        if (e.text != "") {
          return util.format("<li><a href=\"%s\">%s<a/></li>", e.href, e.text);
        }
        else {
          return "";
        }
      }).get().join("\n")
    );

    aReplace("ul#contents li a");

    // Some basic "info" mode key handling
    $("body").keypress(function (evt){
      console.log("got a keypress! ", String.fromCharCode(evt.which));
      var keyStr = String.fromCharCode(evt.which);
      if (keyStr == "<") {
        $("#contents").removeClass("hidden");
        $("#viewer").addClass("hidden");
      }
      else if (keyStr == "b") {
        clickHistory.pop();
        var resource = clickHistory.pop();
        if (resource == null) {
          $("#contents").removeClass("hidden");
          $("#viewer").addClass("hidden");
        }
        else {
          console.log("back! to ", resource);
          docGet(resource);
        }
      }
    });
  });

// app.js ends here
