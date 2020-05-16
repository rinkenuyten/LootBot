Bot = function(){
    console.log('Initializing bot...');

    this.Discord = require("discord.js");
    this.client = new this.Discord.Client();
    this.botSettings = require(__dirname  + '/config/BotConfig.js');

    this.currencyType = "Dollars";

    this.initialize();
};

Bot.prototype = {
    initialize: function() {
        this.client.on('ready', () => {
            this.client.user.setActivity('Gambling').then(function(){
                console.log(`${this.client.user.username} activity set!`);
            }.bind(this));
        });

        this.client.login(this.botSettings.Config.TOKEN).then(function(){
            console.log(`${this.client.user.username} is logged in!`);
        }.bind(this));

        this.setBotMessageHandler();
        this.setBotCurrencyDispenseTimer();
    },

    setBotMessageHandler: function(){
        this.client.on("message", async message => {
            if(message.author.bot) return;
            if(message.channel.type === "dm") return;
            if(message.content.indexOf(this.botSettings.Config.PREFIX) !== 0) return;

            const args = message.content.slice(this.botSettings.Config.PREFIX.length).trim().split(/ +/g);
            const command = args.shift().toLowerCase();

            if(command === "ping") {
                this.ping(message);
            }

            if (command === "setcurrency"){
                if (!message.member.hasPermission("ADMINISTRATOR")) 
                    return;

                let newCurrencyType = args.slice(0).join(' ');

                if(newCurrencyType == "") 
                    return;

                this.currencyType = newCurrencyType;

                const m = await message.channel.send("The currency type is changed to: " + this.currencyType);
            }

            if(command == "dispensecurrency"){
                if (!message.member.hasPermission("ADMINISTRATOR")) 
                    return;

                this.dispenseCurrency();    
            }
        });
    },

    setBotCurrencyDispenseTimer: function(){
        let _this = this;
        setInterval(function(){_this.dispenseCurrency();}, 600000); //run every 10 minutes
    },


    ping: async function (message) {     
        if (!message.member.hasPermission("ADMINISTRATOR"))
            return;

        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(this.client.ping)}ms`);
    },

    dispenseCurrency: function(){
        var userIndex;
        this.client.users.cache.map((user) => {
            if(user.presence.status != "offline" && !user.bot){
                console.log(user.username);
            }           
        });
     
        // for(userIndex in this.client.users.array()){
        //     var user = this.client.users.array()[userIndex];
        //     if(user.presence.status != "offline"){
        //     console.log(User.username);
        //     }
        // }
    }

};

new Bot();