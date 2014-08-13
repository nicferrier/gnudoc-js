var util = require("util");
var $ = require("jquery"); window.$ = $; // useful debugging
//var ac = require("jquery-ui/autocomplete");
var Ac = require("triecomplete");

var loadedIndex = {}; // Stores the GNU manual index
var keymapMode = "normal"; // could be "normal" or "index"
var menu = {};

// Return a function that calls fn with the evt it's passed
// But also evt.preventDefault on that evt
function keyPreventDefault (fn) {
  return function (evt) {
    fn(evt);
    evt.preventDefault();
  };
}

function makeAutoComplete (evt, mapStore) {
  var ac = evt.target["ac"];
  if (ac == null) {
    ac = new Ac();
    evt.target["ac"] = ac;
    var keys = Object.keys(mapStore);
    ac.initialize(keys);
  }
  return ac.search(evt.target.value.toLowerCase()).map(function (e) { 
    return e.key; 
  });
}

// Gnu doc command map - like an "interactive" namespace
var commands = {
  top: keyPreventDefault(function () {
    document.location.href = "/";
  }),
  back: keyPreventDefault(function () {
    window.history.go(-1);
  }),
  forward: keyPreventDefault(function () {
    window.history.go(1);
  }),
  index: keyPreventDefault(function () {
    keymapMode = "index";
    $("#indexUi").toggleClass("hidden");
    $("#indexTerm").focus();
  }),
  indexBackspace: function () {
  },
  indexComplete: function (evt) {
    var comps = makeAutoComplete(evt, loadedIndex);
    if (comps[comps.length - 1].indexOf(comps[0]) == 0) {
      $("#indexCompletions").addClass("hidden"); // not sure about this
      $("#indexTerm").val(comps[0]);
    }
    else {
      $("#indexCompletions").removeClass("hidden");
      $("#indexCompletions ul").html(
        comps.map(function (e) {
          return util.format("<li><a href=\"/info/%s\">%s<a/></li>", loadedIndex[e], e);
        }).join("\n")
      );
    }
    evt.preventDefault();
  },
  indexAc: function (evt) {
    var comps = makeAutoComplete(evt, loadedIndex);
    if (comps.length == 1) {
      $("#indexTerm").val(comps[0]);
      evt.preventDefault();
      return;
    }
  },
  indexEscape: keyPreventDefault(function (evt) {
    keymapMode = "normal";
    $("#indexUi").addClass("hidden");
  }),
  indexLookup: function (evt) {
    var term = $("#indexTerm").val();
    commands.indexEscape(evt);
    var target = loadedIndex[term];
    history.pushState({}, "", target);
    docGet("/info/" + target);
  },
  menu: keyPreventDefault(function (evt) {
    menu = {}; // erase the keys from whatever menu we have
    $(".menu a").map(function (i, e) { 
      menu[e.text.toLowerCase()] = e.getAttribute("href");
    });

    keymapMode = "menu";
    $("#menuUi").toggleClass("hidden");
    $("#menuTerm").removeAttr("disabled");
    $("#menuTerm").focus();
  }),
  menuAc: function (evt) {
    var comps = makeAutoComplete(evt, menu);
    if (comps.length == 1) {
      $("#menuTerm").val(comps[0]);
      evt.preventDefault();
      return;
    }
  },
  menuEscape: keyPreventDefault(function (evt) {
    keymapMode = "normal";
    $("#menuUi").addClass("hidden");
  }),
  menuBackspace: function () {
  },
  menuComplete: function (evt) {
    var comps = makeAutoComplete(evt, menu);
    console.log("menuComplete comps", comps, menu);
    if (comps[comps.length - 1].indexOf(comps[0]) == 0) {
      $("#menuCompletions").addClass("hidden"); // not sure about this
      $("#menuTerm").val(comps[0]);
    }
    else {
      $("#menuCompletions").removeClass("hidden");
      $("#menuCompletions ul").html(
        comps.map(function (e) {
          return util.format("<li><a href=\"/info/%s\">%s<a/></li>", menu[e], e);
        }).join("\n")
      );
    }
    evt.preventDefault();
  },
  menuLookup: function (evt) {
    var term = $("#menuTerm").val();
    commands.menuEscape(evt);
    var target = menu[term];
    history.pushState({}, "", target);
    docGet(target);
  }
};

// Gnu doc keymap - nowhere near as powerful as Emacs.
var keymap = {
  "normal": {
    "<": commands.top,
    "T": commands.top,
    "L": commands.back,
    "F": commands.forward,
    "I": commands.index,
    "M": commands.menu
  },
  "index": {
    "DEFAULT": commands.indexAc
  },
  "menu": {
    "DEFAULT": commands.menuAc
  }
};
// Some of the keymap commands have to be specified as puts
keymap["index"][String.fromCharCode(27)] = commands.indexEscape;
keymap["index"][String.fromCharCode(13)] = commands.indexLookup;
keymap["index"][String.fromCharCode(8)] = commands.indexBackspace;
keymap["index"][String.fromCharCode(9)] = commands.indexComplete;
keymap["menu"][String.fromCharCode(27)] = commands.menuEscape;
keymap["menu"][String.fromCharCode(13)] = commands.menuLookup;
keymap["menu"][String.fromCharCode(8)] = commands.menuBackspace;
keymap["menu"][String.fromCharCode(9)] = commands.menuComplete;


$(document).ready(function (){
  if (document.location.pathname.indexOf("/info/") == 0) {
    docGet(document.location.pathname);
  }
});

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

function docGet (infoTarget) {
  console.log("docGet: infoTarget = ", infoTarget);
  var target = infoTarget.split("/info/")[1] || "/";
  if (target == "/") {
    $("#viewer").addClass("hidden");
    $("#contents").removeClass("hidden");
  }
  else {
    console.log("docGet: target = ", target);
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
        $("#viewer").empty().html(body);
        $("#viewer").removeClass("hidden");
        aReplace("#viewer a");
        $("#viewer").focus();
      }
    });
  }
}

function docClick (evt) {
  var target = $(evt.target).attr("href").split(" ");
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
    if (href != null) {
      if (href.match(/#Top/) != null) {
        el.attr("href", "/");
      }
      else {
        el.attr("href", "/info/" + href);
      }
    }
  });
  $(selector).click(function (evt) { return docClick (evt); });
}

function keyDispatch (evt) {
  var keyStr = String.fromCharCode(evt.which);
  var command = keymap[keymapMode][keyStr];
  if (typeof(command) == "function") {
    command(evt);
  }
  else {
    command = keymap[keymapMode]["DEFAULT"];
    if (typeof(command) == "function") {
      command(evt);
    }
  }
}

// Load the TOC into a hidden DOM node for manipulation
$("#tocHidden").load(
  "/manual/elisp/index.html #content",
  function () {
    console.time("index");
    var docTables = $("#tocHidden table");
    // If we use the tr we could possibly get the 2nd TD, a long description
    var hrefs = $("tr", docTables.get(0)).map(
      function (i, e) {
        var a = $("a", e);
        return { "href": a.attr("href"), "text": a.text() };
      }
    ).get();
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
    console.timeEnd("index");

    // Some basic "info" mode key handling
    $("body").keydown(function (evt){ keyDispatch(evt); });
  });

// Load the index
$("#indexHidden").load(
  "/manual/elisp/Index.html .index-fn",
  function () {
    $("#indexTerm").removeAttr("disabled");
    $("#indexTerm").focus(function (evt) { 
      // Reset the value so that the cursor is at the end
      var value = evt.target.value;
      evt.target.value = "";
      evt.target.value = value;
    });
    $("#indexHidden li").each(function (i, e) {
      var firstA = $($("a", e)[0]);
      var key = firstA.text();
      var ref = firstA.attr("href");
      loadedIndex[key] = ref;
    });
    console.log("index is loaded");
  }
);

// app.js ends here
