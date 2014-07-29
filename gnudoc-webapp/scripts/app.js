var util = require("util");
var $ = require("jquery-browserify");


function docClick (evt) {
  var target = $(evt.target).attr("ref");
  console.log(util.format("viewer %s", target));
  $("#viewer").load(
    "/manual/elisp/" + target, 
    function () { aReplace("#viewer a");});
  return false;
}

// replace all the A hrefs in a section
function aReplace (selector) {
  $(selector).each(function (i, e) {
    var el = $(e);
    var href = el.attr("href");
    el.attr("href", "#");
    el.attr("ref", href);
    $(selector).click(function (evt) { docClick (evt); });
  });
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
  });

// app.js ends here
