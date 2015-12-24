/**
 * Created by huy on 12/23/15.
 */
const DB_TASK = "task";
const DB_HISTORY = "history";
const DB_BACKLOG_API_KEY = "backlogKey";
const DB_IDLE_STATE = "idleState";

var tasks = [];
var historyTasks = [];
var selectedHistory = [];
var backlogApiKey = undefined;

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
    var d = new Date();
    var currentDbIdleState = DB_IDLE_STATE+"_"+d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
    chrome.storage.sync.get([DB_TASK, DB_HISTORY, DB_BACKLOG_API_KEY, currentDbIdleState], function (obj) {
      console.log(obj);
      var objTask = obj[DB_TASK];
      tasks = objTask !== undefined ? objTask.tasks !== undefined ? objTask.tasks : [] : [];
      var objHistory = obj[DB_HISTORY];
      historyTasks = objHistory !== undefined ? objHistory.tasks !== undefined ? objHistory.tasks : [] : [];
      backlogApiKey = obj[DB_BACKLOG_API_KEY];

      tasks = sortByPriority(tasks);
      historyTasks = sortByCompleteTime(historyTasks);

      // Move yesterday task to storage
      tasks = filterPastTasks(tasks);

      console.log(tasks);

      // show to ui
      renderTasks(tasks);

      renderHistory(historyTasks);

      renderSetting(backlogApiKey);

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

    $("#report-date").change(function(){
      var reportDate = $("#report-date").val();
      var d = new Date(reportDate);
      setWorkingTime(d);
    });
    setWorkingTime(d); // Initial

    document.getElementById("report-date").valueAsDate = new Date();

    chrome.idle.onStateChanged.addListener(function(newState){
      console.log("IdleState", newState);
      //saveState(newState);
    });
  }
);

function renderTasks(tasks) {
  tasks.forEach(function (task, i) {
    uiAddTask(task, i);
  });
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
    console.log('Settings saved');
  });
}

function saveHistory(tasks) {
  var data = {};
  data[DB_HISTORY] = {tasks: tasks};
  chrome.storage.sync.set(data, function () {
    console.log('Settings saved');
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

function setTextTime(){
  var date = new Date();
  var hours = date.getHours();
  hours = hours < 10?"0"+hours:hours;
  var minutes = date.getMinutes();
  minutes = minutes <10?"0"+minutes:minutes;
  $("#text-time").html(hours+":"+ minutes);
}

function setWorkingTime(d){
  var currentDbIdleState = DB_IDLE_STATE + "_" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  chrome.storage.sync.get(currentDbIdleState, function (obj) {
    console.log(obj, currentDbIdleState);
    var objIdleStates = obj[currentDbIdleState];
    var idleStates = objIdleStates !== undefined ? objIdleStates : {};
    if (idleStates.firstActive!== undefined){
      var dateStart = new Date(idleStates.firstActive);
      $("#work-start").html(dateStart.getHours()+":"+dateStart.getMinutes());
    }

    if (idleStates.lastActive!== undefined){
      var dateEnd = new Date(idleStates.lastActive);
      $("#work-end").html(dateEnd.getHours()+":"+dateEnd.getMinutes());
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
    var reportTasks = [];
    var desc = "##My today's tasks: \n";
    selectedHistory.forEach(function (i) {
      reportTasks.push(historyTasks[i]);
      desc += " * " + historyTasks[i].name + "\n";
    });
    desc += "\n ----- Generated by Daily report Chrome extension -----";

    console.log(reportTasks);
    console.log(desc);

    // Gen report
    var reportDate = $("#report-date").val();
    console.log(reportDate);
    //TODO: api call
    var summary = "Daily report " + reportDate;
    if (confirm("Do you want to report this to backlog:\n\n Summary: " + summary+ "\n\n" + desc)) {
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

function reportToLiteReport() {
  // TODO: implement here
}