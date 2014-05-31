Meteor.subscribe('intercomHash');

var minimumUserInfo = function(user) {
  var info = {
    app_id: Meteor.settings.public.intercom.id,

    user_id: user._id,

    created_at: Math.round(Meteor.user().createdAt/1000)
  }

  // they actually need to have this but it can be useful for testing
  if (user.intercomHash)
    info.user_hash = user.intercomHash;

  return info;
}



IntercomSettings = {
  // if you want to manually call it
  minimumUserInfo: minimumUserInfo
}

var IntercomQueue = {
  _isRunning: false,
  _queue: [],

  addItem: function(item) {
    this._queue.push(item);
    if (!this._isRunning) {
      this._process();
    }
  },
  _process: function () {
    this._isRunning = true;
    console.log('Checking queueu', this._queue.length, 'items');

    // TODO: Should check if item.widget has been set (meaning Intercom has
    // responded (I assume...)). If not set, return and re-run _process (with
    // timeout). For now we just asume the general queue step timout is enough
    // for Intercom to complete. When we've changed this we can recduce the
    // queue step timeout.
    // NOTES TO SELF:
    // If user has changed - we have to Shutdown Intercom or data will be tracked
    // to the wrong user.
    //  if (typeof userId === 'string' && userId !== user._id) {
    //  }

    var item = this._queue.shift();
    console.log(item);

    if (item) {

      // TODO: If it's the same userId and Intercom has already booted, use
      // 'update' instead of 'shutdown' + 'boot'.

      Intercom('shutdown');
      Intercom('boot', item);

      Meteor.setTimeout(function(){
        IntercomQueue._process()
      }, 500);
    } else {
      console.log('stopping queueu');
      this._isRunning = false;
    }
  }
};

// send data to intercom
Meteor.startup(function() {
  Deps.autorun(function() {
    var user = Meteor.user();
    if (!user) // "log out"
      return Intercom('shutdown');

    var info = IntercomSettings.minimumUserInfo(user);
    if (IntercomSettings.userInfo) {
      var ready = IntercomSettings.userInfo(user, info);
      if (ready === false)
        return;
    }

    if (info) {
      IntercomQueue.addItem(info);
    }
  });
})
