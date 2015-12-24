/**
 * Created by kuma on 12/24/15.
 */
const DB_IDLE_STATE = "idleState";

chrome.idle.onStateChanged.addListener(function (newState) {
  console.log("IdleState", newState);
  saveState(newState);
});

function saveState(state) {
    var d = new Date();
    var currentDbIdleState = DB_IDLE_STATE + "_" + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    chrome.storage.sync.get(currentDbIdleState, function (obj) {
      // Get state from storage
      var objIdleStates = obj[currentDbIdleState];
      var idleStates = objIdleStates !== undefined ? objIdleStates : {};
      // Update state
      if (state == "active" && idleStates.firstActive === undefined) {
        idleStates.firstActive = d.getTime();
      }
      idleStates.lastActive = d.getTime();

      // Save state to storage
      var data = {};
      data[currentDbIdleState] = idleStates;
      console.log("save Idle State", data);
      chrome.storage.sync.set(data, function () {
        console.log('idleState saved');
      });
    });
}