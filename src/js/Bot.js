Bot = function(){
    console.log('Initializing bot...');

    this.Discord = require("discord.js");
    this.client = new this.Discord.Client();
    this.botSettings = require(__dirname  + '/config/BotConfig.js');
    this.currencyType = "Dollars";

    this.initializeDatabase();
    this.initializeClient();
};

Bot.prototype = {

    initializeDatabase: function() {
        //lowdb database requirements
        const low = require('lowdb');
        const FileSync = require('lowdb/adapters/FileSync');  
        const adapter = new FileSync('db.json');
        this.db = low(adapter);

        this.db.defaults({ users:[], currencyType: this.currencyType})
            .write();            
    },

    initializeClient: function() {
        this.client.on('ready', () => {
            this.client.user.setActivity('Gambling').then(function(){
                console.log(`${this.client.user.username} activity set!`);
            }.bind(this));
        });

        //Login
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

            if(command === "help"){
                var cmds = `

                !help - you dummy that is this command
                !ping [Admin only] - gets ping between bot & server
                !setcurrencytype [Admin only] - sets the currency type people collect
                !dispensecurrency <amount> [Admin only] - give everyone online x amount of `+this.currencyType+`
                !amount - get your amount of `+this.currencyType+`
                !give <@Person> <amount> - give the tagged person x amount of `+this.currencyType+`
                        `;

                let embed = new this.Discord.MessageEmbed()
                    .setColor("#d86c24")
                    .addField("I support the following commmands", cmds, true);

                const m = await message.channel.send(embed);
            }

            if(command === "ping") {
                this.ping(message);
            }

            if (command === "setcurrencytype"){
                if (!message.member.hasPermission("ADMINISTRATOR")) 
                    return;

                let newCurrencyType = args.slice(0).join(' ');

                if(newCurrencyType == "") 
                    return;

                this.currencyType = newCurrencyType;
                this.db.update('currencyType', this.currencyType)
                    .write()

                const m = await message.channel.send("The currency type is changed to: " + this.currencyType);
            }

            if(command === "dispensecurrency"){
                if (!message.member.hasPermission("ADMINISTRATOR")) 
                    return;

                let amount = args.slice(0).join(' ');

                if(amount == "") 
                    return;

                this.dispenseCurrency(amount);  
                const m = await message.channel.send("Everyone got " + amount + " " + this.currencyType);  
            }

            if(command === "amount"){
                var amount = this.getCurrencyAmountFromPlayer(message.member.id);

                if(amount == -1){
                    const m = await message.channel.send("You got no " + this.currencyType);
                    return;
                }

                const m = await message.channel.send("You got " + amount + " " + this.currencyType);
            }

            if(command === "give"){
                if(message.mentions.users.array().length === 0){
                    const m = await message.channel.send("Tag someone to give " + this.currencyType);
                    return;
                }

                let taggedPlayerId = message.mentions.users.array()[0].id;

                let amount = args[1];

                if(typeof(amount) == "undefined"){
                    const m = await message.channel.send("Define an amount to give");
                    return;
                }
           
                if(!Number.isInteger(Number(amount))){
                    console.log(amount + " is not a number");
                    const m = await message.channel.send("Defined amount is not a number");
                    return;
                }

                let isPossible = this.donateCurrencyToPlayer(message.author.id, taggedPlayerId, amount);

                if(!isPossible){
                    const m = await message.channel.send("Failed to send " + this.currencyType);
                    return;
                }
                const m = await message.channel.send("Transferred " + amount + " " + this.currencyType + " to " + message.mentions.users.array()[0].username);
            }
        });
    },

    setBotCurrencyDispenseTimer: function(){
        let _this = this;
        setInterval(function(){_this.dispenseCurrency(10);}, 600000); //run every 10 minutes
    },

    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)   
    ping: async function (message) {     
        if (!message.member.hasPermission("ADMINISTRATOR"))
            return;


        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(this.client.ping)}ms`);
    },

    dispenseCurrency: function(amount){       
        this.client.users.cache.map((user) => {
            if(user.presence.status != "offline" && !user.bot){
                this.addCurrencyToPlayer(user.id, amount);
            }           
        }); 
    },

    addCurrencyToPlayer: function(id, amountToAdd){      
        let user = this.db.get('users')
            .find({ id: id })
            .value();

        //if no playerdata exists, create a new record    
        if(typeof(user) == "undefined"){
            this.db.get('users')
                .push({ id: id, amount: amountToAdd})
                .write();
            return;
        }    
            
        var newAmount = Number(user.amount) + Number(amountToAdd);

        this.db.get('users')
            .find({ id: id })
            .assign({ amount: newAmount})
            .write();
    },

    removeCurrencyFromPlayer: function(id, amountToRemove){
        let user = this.db.get('users')
        .find({ id: id })
        .value();

        if(typeof(user) == "undefined"){          
            return false;
        }    

        if(user.amount < amountToRemove){
            return false;
        }

        var newAmount = Number(user.amount) - Number(amountToRemove);

        this.db.get('users')
            .find({ id: id })
            .assign({ amount: newAmount})
            .write();

        return true;    
    },

    getCurrencyAmountFromPlayer: function(id){
        let user = this.db.get('users')
        .find({ id: id })
        .value();
 
        if(typeof(user) == "undefined"){       
            return -1;
        }
        
        return user.amount;
    },

    donateCurrencyToPlayer: function(senderId, receiverId, amount){
        if(this.removeCurrencyFromPlayer(senderId, amount)){
            this.addCurrencyToPlayer(receiverId, amount);
            return true;
        }else{
            return false;
        }    
    },
};

new Bot();