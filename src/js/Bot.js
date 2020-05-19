Bot = function(){
    console.log('Initializing bot...');

    this.Discord = require("discord.js");
    this.client = new this.Discord.Client();

    require(__dirname  + '/Persistance.js');

    this.persistance = new Persistance();

    this.botSettings = require(__dirname  + '/config/BotConfig.js');

    this.currencyType = this.botSettings.Config.CURRENCY_TYPE;

    this.initializeClient();
};

Bot.prototype = {

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

                !help - you dummy that's this command
                !ping [Admin only] - gets the ping between bot & server
                !dispensecurrency <amount> [Admin only] - give everyone online x amount of `+this.currencyType+`
                !amount - get your amount of `+this.currencyType+`
                !give <@User> <amount> - give the tagged user x amount of `+this.currencyType+`
                `;

                let embed = new this.Discord.MessageEmbed()
                    .setColor("#d86c24")
                    .addField("I support the following commmands", cmds, true);

                const m = await message.channel.send(embed);
            }

            if(command === "ping") {
                this.ping(message);
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
                this.getCurrencyAmountFromUser(message.member.id).then(async function(amount){
                    if(amount == -1){
                        const m = await message.channel.send("You got no " + this.currencyType);
                        return;
                    }
    
                    const m = await message.channel.send("You got " + amount + " " + this.currencyType);
                }.bind(this));     
            }

            if(command === "give"){
                if(message.mentions.users.array().length === 0){
                    const m = await message.channel.send("Tag someone to give " + this.currencyType);
                    return;
                }

                let taggedUserId = message.mentions.users.array()[0].id;

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

                this.donateCurrencyToUser(message.author.id, taggedUserId, amount).then( async function(success){
                    if(success){
                        const m = await message.channel.send("Transferred " + amount + " " + this.currencyType + " to " + message.mentions.users.array()[0].username);
                        return;
                    }
                    const m = await message.channel.send("Failed to send " + this.currencyType);
                }.bind(this))
            }
        });
    },

    /**
     * Set the dispense currency timer to give all online users X amount every Y minutes.
     * @TODO: X and Y should be able to be defined in the config file.
     */
    setBotCurrencyDispenseTimer: function(){
        let _this = this;
        setInterval(function(){_this.dispenseCurrency(10);}, 600000); //run every 10 minutes
    },

    /**
     * Calculates ping between sending a message and editing it, giving a nice round-trip latency.
     * The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)   
     * @param {Discord.message} message - The discord message
     */
    ping: async function (message) {     
        if (!message.member.hasPermission("ADMINISTRATOR"))
            return;


        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(this.client.ping)}ms`);
    },

    /**
     * Dispense currency to all online users
     * @param {number} amount - Amount of currency to add
     */ 
    dispenseCurrency: function(amount){       
        this.client.users.cache.map((user) => {
            if(user.presence.status != "offline" && !user.bot){
                this.addCurrencyToUser(user.id, amount);
            }           
        }); 
    },

    /**
     * Add currency to a user
     * @param {number} id - A userId
     * @param {number} amountToAdd - Amount of currency to add
     * @returns {Query} - Returns a mongoose query
     */ 
    addCurrencyToUser: function(id, amountToAdd){      
        return this.persistance.getUserById(id).then( function(userData){       
            if(userData === null){
                this.createNewUser(id, amountToAdd);
                return;               
            }
     
            userData.amount = Number(userData.amount) + Number(amountToAdd);

            this.persistance.updateUser(userData).exec();
        }.bind(this));
    },

    /**
     * Creates a new user in the database
     * @param {number} id - A userId
     * @param {number} amount - Amount of currency to add
     */ 
    createNewUser: function(id, amount){
        this.persistance.createUser(id, amount).then(function(result){
            
        }.bind(this));
    },
  
    /**
     * Remove currency from a user
     * @param {number} id - A userId
     * @param {number} amountToRemove - Amount of currency to add
     * @returns {Query} - Returns a mongoose query with true or false based on succession
     */ 
    removeCurrencyFromUser: function(id, amountToRemove){     
        return this.persistance.getUserById(id).then( function(userData){       
            if(userData === null){
                this.createNewUser(id);
                return false;               
            }

            if(userData.amount < amountToRemove){
                return false;
            }
            
            userData.amount = Number(userData.amount) - Number(amountToRemove);

            this.persistance.updateUser(userData).exec();
            return true;
        }.bind(this)); 
    },

    /**
     * Get the current amount of currency from a user
     * @param {number} id - A userId
     * @returns {Query} - Returns a mongoose query with -1 or the amount of currency
     */ 
    getCurrencyAmountFromUser: function(id){
        return this.persistance.getUserById(id).then( function(userData){       
            if(userData === null){
                console.log("no record found, creating a new one");
                this.createNewUser(id);
                return -1;               
            }else{
                return userData.amount;
            }    
        }.bind(this));
    },

    /**
     * Donate an amount of currency to a user
     * @param {number} senderId - The userId of the sender
     * @param {number} receiverId - The userId of the receiver
     * @param {number} amount - The amount to donate
     * @returns {Query} - Returns a mongoose query with true or false based on succession
     */ 
    donateCurrencyToUser: function(senderId, receiverId, amount){
        return this.removeCurrencyFromUser(senderId, amount).then( function(success){
            if(success){
                this.addCurrencyToUser(receiverId, amount);
                return true;
            }

            return false;
        }.bind(this));
    },
};

new Bot();