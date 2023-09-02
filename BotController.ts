import { Message, Update } from "typegram";
import {Telegraf, Input, Markup, Context, Scenes, session, NarrowedContext} from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const bot_token = process.env.BOT_TOKEN as string;
const chat_id = parseInt(process.env.CHANNEL_ID as string);

const bug_hunters = new Set ();
const nerds = new Set ();


export class Bot extends Telegraf<Context<Update>>{
  constructor(){
    super(bot_token);
    this.handlerWalter();
  }

  startBot(){
    this.launch();
    const date = new Date();
    console.log('Bot started at ' + date.getHours() + ":" + date.getMinutes());
  
    // Enable graceful stop
    process.once('SIGINT', () => this.stop('SIGINT'));
    process.once('SIGTERM', () => this.stop('SIGTERM'));
  }

  handlerWalter(){
    this.handleStart();
    this.handleFeedback();
    this.handleBug();
    this.handleSuggestion();
    this.handleCancel();
    this.textMiddleware();
    this.handleDelete();

    this.telegram.setMyCommands([
      {
        command: 'start',
        description: 'restart bot',
      },
      {
        command: 'feedback',
        description: 'leave feedback',
      }
  ]);
  }

  handleStart(){
    this.start((ctx)=>{
      ctx.reply('Welcome, stranger!');
    })
  }

  handleFeedback(){
    this.command('feedback', (ctx) => {
      return ctx.reply(
        'What kind of feedback do you have?',
        Markup.keyboard([
            ['Bug 👾', 'Suggestion 📝'],
        ])
        .oneTime()
        .resize()
      )
    })
  }

  handleBug(){
    this.hears('Bug 👾', async (ctx) => {
      ctx.reply('Please, describe what kind of bug you witnessed and how & when it appeared',  Markup.keyboard([
        ['Cancel❌'],
      ])
      .oneTime()
      .resize());
        
      bug_hunters.add(ctx.chat.id);
    })
  }

  handleSuggestion(){
    this.hears('Suggestion 📝', (ctx)=>{
      ctx.reply('Please, describe what do you want to see in the game',  Markup.keyboard([
        ['Cancel❌'],
      ])
      .oneTime()
      .resize());
      nerds.add(ctx.chat.id);
    })
  }

  handleCancel(){
    this.hears('Cancel❌', (ctx)=>{
      let reply_msg = '';
      if (bug_hunters.has(ctx.chat.id) || nerds.has(ctx.chat.id)){
        reply_msg = 'Report Cancelled';
        bug_hunters.delete(ctx.chat.id);
        nerds.delete(ctx.chat.id);
      }
      else{
        reply_msg = 'Unknown command';
      }
      ctx.reply(reply_msg, Markup.removeKeyboard())
    })
  }

  textMiddleware(){
    this.on('text', (ctx) => {
      if (bug_hunters.has(ctx.chat.id) || nerds.has(ctx.chat.id)){
        const tag = getTag(ctx.chat.id);
        this.sendFeedback(tag, ctx.message.text);

        ctx.reply('Report sent!\nThank you for making Grimoono better!', Markup.removeKeyboard());

        nerds.delete(ctx.chat.id);
        bug_hunters.delete(ctx.chat.id);
      }
      else{
        ctx.reply('Unknown command');
      }
    })
  }

  sendFeedback(tag: string, message: string){
    this.telegram.sendMessage(chat_id, `\n#${tag}\n\n`+message, 
      Markup.inlineKeyboard([
        Markup.button.callback('Delete', 'delete_feedback')
      ])
    );
  }

  handleDelete(){
    this.action('delete_feedback', ctx => {
      ctx.deleteMessage()
    })
  }
}


const getTag = (id: number) => {
  if (nerds.has(id)) return 'suggestion'
  return 'bug'
}