Persistance = function(){
    require(__dirname  + '/User_model.js');
    this.p_controller = require(__dirname  + '/User_controller.js');

    const botSettings = require(__dirname  + '/config/BotConfig.js');
    const mongoose = require('mongoose');
    mongoose.set('useFindAndModify', false);
    mongoose.connect(botSettings.Config.DB_CONNECT_URL, {useNewUrlParser: true});

    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
};

Persistance.prototype.getUserById = function(userId){
    return this.p_controller.getUserById(userId);
};

Persistance.prototype.createUser = function(userId, amount){
    if(amount == null) amount = 0;
    if(Number(amount) == "undefined") amount = 0;

    var newUser = {   
        userId: userId,
        amount: amount
    };

    return this.p_controller.createUser(newUser);
};

Persistance.prototype.updateUser = function(userData){
    return this.p_controller.updateUser(userData);
};