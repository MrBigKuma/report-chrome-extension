/**
 * Created by huy on 12/23/15.
 */
const DB_TASK = "task";
const DB_HISTORY = "history";
const DB_BACKLOG_API_KEY = "backlogKey";
const DB_IDLE_STATE = "idleState";
const DB_LITE_REPORT = "liteReport";

var tasks = [];
var historyTasks = [];
var selectedHistory = [];
var backlogApiKey = undefined;
var token = undefined;
var cardId = undefined;
var email = undefined;

$(document).ready(function () {
    // Button new task click
    $("#btn-new").click(function () {
      $("#div-new-task").show();
      $("#input-new-task").focus();
      $("#btn-new").hide();
    });

    $("#btn-report-panel").click(function () {
      $("#report-panel").toggle();
    });

    $("#btn-setting").click(function () {
      $("#setting-panel").toggle();
    });

    // Input enter new task
    $("#input-new-task").keydown(function (e) {
      if (e.which === 13) {
        console.log($(this).val());

        // Gen priority
        var priority = 0;
        if (tasks.length > 0) {
          priority = tasks[tasks.length - 1].priority + 1;
        }

        // Gen object
        var date = new Date();
        var newTask = {
          name: $(this).val(),
          time: date.getTime(),
          complete: false,
          priority: priority,
          completeTime: 0
        };
        tasks.push(newTask);

        // Save to storage
        saveTasks(tasks);

        // Render ui
        uiAddTask(tasks[tasks.length - 1], tasks.length - 1);

        // Hide and show ui
        $("#div-new-task").hide();
        $("#btn-new").show();
      }
    });

    // Get data from storage
    chrome.storage.sync.get([DB_TASK, DB_HISTORY, DB_BACKLOG_API_KEY, DB_LITE_REPORT], function (obj) {
      console.log(obj);
      var objTask = obj[DB_TASK];
      tasks = objTask !== undefined ? objTask.tasks !== undefined ? objTask.tasks : [] : [];
      var objHistory = obj[DB_HISTORY];
      historyTasks = objHistory !== undefined ? objHistory.tasks !== undefined ? objHistory.tasks : [] : [];
      backlogApiKey = obj[DB_BACKLOG_API_KEY];
      var objLiteReport = obj[DB_LITE_REPORT];
      objLiteReport = objLiteReport !== undefined ? objLiteReport : {};
      token = objLiteReport.token;
      cardId = objLiteReport.cardId;
      email = objLiteReport.email;

      tasks = sortByPriority(tasks);
      historyTasks = sortByCompleteTime(historyTasks);

      // Move yesterday task to storage
      tasks = filterPastTasks(tasks);

      console.log(tasks);

      // show to ui
      renderTasks(tasks);

      renderHistory(historyTasks);

      renderSetting(backlogApiKey);

      renderLiteReportSetting(token, email);

      renderHelloText(email);
    });

    $("#input-api-key").keydown(function (e) {
      if (e.which === 13) {
        var apiKey = $(this).val();
        console.log(apiKey);
        backlogApiKey = apiKey;
        setBacklogApiKey(apiKey);
      }
    });

    $("#btn-report-backlog").click(function () {
      reportToBacklog();
    });

    $("#btn-report-lite-report").click(function () {
      reportToLiteReport();
    });

    setTextTime();

    $("#report-date").change(function () {
      var reportDate = $("#report-date").val();
      var d = new Date(reportDate);
      setWorkingTime(d);
    });
    var d = new Date();
    setWorkingTime(d); // Initial

    document.getElementById("report-date").valueAsDate = new Date();

    chrome.idle.onStateChanged.addListener(function (newState) {
      console.log("IdleState", newState);
      //saveState(newState);
    });

    $("#btn-login").click(login);
    $("#btn-logout").click(logout);
  }
);

function renderTasks(tasks) {
  tasks.forEach(function (task, i) {
    uiAddTask(task, i);
  });
}

function renderHelloText(email){
  if (email != undefined){
    $("#text-hello").html("Hello, "+email.split('@')[0]);
  } else {
    $("#text-hello").html("");
  }
}

function uiAddTask(task, i) {
  var completeClass = task.complete ? "task-complete" : "";
  var checked = task.complete ? "checked" : "";

  var item = i === 0 ?
  '<h2 class="text-center col col-md-6 col-md-offset-3 task-item glow ' + completeClass + '"><input id="task' + i + '" type="checkbox" ' + checked + '/> ' + task.name + genBtnRemove(i) + '</h2>' :
  '<p class="col col-md-4 col-md-offset-4 task-item glow ' + completeClass + '"><input id="task' + i + '" type="checkbox" ' + checked + '/> ' + task.name + genBtnRemove(i) + '</p>';
  $("#task-list").append(item);

  // On check box click
  $("#task" + i).click(function () {
    var index = $(this).attr('id').substring(4);
    console.log(index, tasks[index]);

    tasks[index].complete = this.checked;
    tasks[index].completeTime = new Date().getTime();
    $(this).parent().toggleClass('task-complete');

    saveTasks(tasks);
  });

  // On remove button click
  $("#btn-rm" + i).click(function () {
    var index = $(this).attr('id').substring(6);
    tasks.splice(index, 1);
    saveTasks(tasks);
    $(this).parent().remove();
  });
}

function sortByPriority(tasks) {
  return tasks.sort(function (a, b) {
    return a.priority - b.priority;
  });
}

function sortByCompleteTime(tasks) {
  return tasks.sort(function (a, b) {
    return b.completeTime - a.completeTime;
  });
}

function saveTasks(tasks) {
  var data = {};
  data[DB_TASK] = {tasks: tasks};
  chrome.storage.sync.set(data, function () {
    console.log('Tasks saved');
  });
}

function saveHistory(tasks) {
  var data = {};
  data[DB_HISTORY] = {tasks: tasks};
  chrome.storage.sync.set(data, function () {
    console.log('History saved');
  });
}

function genBtnRemove(i) {
  return '<button id="btn-rm' + i + '" type="button" class="btn btn-sm btn-default btn-rm" aria-label="Left Align"> ' +
    '<span class="glyphicon glyphicon-remove-sign" aria-hidden="true"></span> ' +
    '</button>';
}

function filterPastTasks(tasks) {
  var filteredTasks = [];

  var todayDate = new Date().getDate();
  tasks.forEach(function (task) {
    var date = new Date(task.completeTime).getDate();
    if (task.complete && todayDate != date) {
      historyTasks.push(task);
    } else {
      filteredTasks.push(task);
    }
  });
  saveTasks(filteredTasks);
  saveHistory(historyTasks);
  return filteredTasks;
}

function renderHistory(tasks) {
  tasks.forEach(function (task, i) {
    var d = new Date(task.completeTime);
    var item = '<li class="list-group-item">' +
      '<input id="' + 'history' + i + '" type="checkbox"> ' +
      task.name +
      '<span class="pull-right"> (' + (d.getMonth() + 1) + '/' + d.getDate() + ') </span>' +
      '</li>';
    $("#history-task-list").append(item);
    $("#history" + i).click(function () {
      var index = $(this).attr('id').substring(7);
      if (this.checked) {
        selectedHistory.push(index);
      } else {
        selectedHistory.splice(selectedHistory.indexOf(index), 1);
      }
      console.log(selectedHistory);
    });
  });
}

function renderSetting(backlogApiKey) {
  $("#input-api-key").val(backlogApiKey);
}

function setTextTime() {
  var date = new Date();
  var hours = date.getHours();
  hours = hours < 10 ? "0" + hours : hours;
  var minutes = date.getMinutes();
  minutes = minutes < 10 ? "0" + minutes : minutes;
  $("#text-time").html(hours + ":" + minutes);
}

function setWorkingTime(d) {
  var currentDbIdleState = DB_IDLE_STATE + "_" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  chrome.storage.sync.get(currentDbIdleState, function (obj) {
    console.log(obj, currentDbIdleState);
    var objIdleStates = obj[currentDbIdleState];
    var idleStates = objIdleStates !== undefined ? objIdleStates : {};
    if (idleStates.firstActive !== undefined) {
      var dateStart = new Date(idleStates.firstActive);
      $("#work-start").html(dateStart.getHours() + ":" + dateStart.getMinutes());
    }

    if (idleStates.lastActive !== undefined) {
      var dateEnd = new Date(idleStates.lastActive);
      $("#work-end").html(dateEnd.getHours() + ":" + dateEnd.getMinutes());
    }

  });

}

/*----------------Backlog-------------------*/

function setBacklogApiKey(key) {
  var data = {};
  data[DB_BACKLOG_API_KEY] = key;
  chrome.storage.sync.set(data, function () {
    console.log('Settings saved');
  });
}

function reportToBacklog() {
  if (backlogApiKey != undefined) {
    var desc = genDesc(selectedHistory);

    // Gen report
    var reportDate = $("#report-date").val();
    console.log(reportDate);

    var workStart = $("#work-start").val();
    var workEnd = $("#work-end").val();
    if (workStart.length > 0 && workEnd.length > 0) {
      desc = "Work time: " + workStart + " - " + workEnd + "\n" + desc;
    }
    var summary = "Daily report " + reportDate;
    if (confirm("Do you want to report this to backlog:\n\n Summary: " + summary + "\n\n" + desc)) {
      $.post("https://atw-proj.backlog.jp/api/v2/issues?apiKey=" + backlogApiKey,
        {
          projectId: 13704,
          summary: summary,
          description: desc,
          issueTypeId: 60011,
          priorityId: 3
        }, function (data) {
          console.log(data);
        });
    } else {
      console.log("cancel");
    }
  } else {
    alert("No backlog Api was set");
  }
}

/*------------------Lite Report-----------------*/

function login() {
  var email = $("#email").val();
  var password = $("#password").val();
  console.log(email, password);
  $.post("http://192.168.147.36:8002/api/v1/user/login",
    JSON.stringify({
      email: email,
      password: password
    }), function (data) {
      console.log(data);
      token = data['token'];
      cardId = data['card_id'];
      email = data['email'];
      saveLiteReport(token, cardId, email);
      renderLiteReportSetting(token, email);
      renderHelloText(email);
    });
}

function logout() {
  token = undefined;
  cardId = undefined;
  email = undefined;
  clearLiteReport();
  renderLiteReportSetting(token, email);
  renderHelloText(email);
}

function reportToLiteReport() {
  if (token != undefined) {
    var desc = genDesc(selectedHistory);

    // Gen report
    var reportDate = $("#report-date").val();
    console.log(reportDate);

    var workStart = $("#work-start").html();
    var workEnd = $("#work-end").html();
    if (confirm("Do you want to report this to Lite Report:\n\n Work time: " + workStart + " - " + workEnd + "\n\n" + desc)) {
      $.post("http://192.168.147.36:8002/api/v1/reports?token=" + token,
        JSON.stringify({
          "card_id": cardId,
          "email": email,
          "time_from": workStart,
          "time_to": workEnd,
          "tasks": desc,
          "break_time": "1:00",
          "created_date": new Date(reportDate).getTime()
        }), function (data) {
          console.log(data);
        });
    } else {
      console.log("cancel");
    }
  } else {
    alert("No backlog Api was set");
  }
}

function saveLiteReport(token, cardId, email) {
  var data = {};
  data[DB_LITE_REPORT] = {
    token: token,
    cardId: cardId,
    email: email
  };

  chrome.storage.sync.set(data, function () {
    console.log('LiteReport saved');
  });
}

function clearLiteReport() {
  var data = {};
  data[DB_LITE_REPORT] = {
    token: undefined,
    cardId: undefined,
    email: undefined
  };

  chrome.storage.sync.set(data, function () {
    console.log('LiteReport saved');
  });
}

function renderLiteReportSetting(token, email) {
  if (token !== undefined) {
    $("#login-form").hide();
    $("#lite-report").show();
    $("#text-email").html(email);
  } else {
    $("#login-form").show();
    $("#lite-report").hide();
  }
}

function genDesc(tasks) {
  var desc = "### My today's tasks: \n";
  tasks.forEach(function (i) {
    desc += " * " + historyTasks[i].name + "\n";
  });
  desc += "\n ----- Generated by Campfire Chrome extension -----";
  console.log(desc);
  return desc;
}