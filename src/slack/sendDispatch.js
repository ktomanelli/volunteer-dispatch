require("dotenv").config();
const config = require("../config");
const { bot, token } = require("./bot");
const message = require("./message");
const { followUpButton } = require("./reminder");

const channel = config.SLACK_CHANNEL_ID;

const sendPrimaryRequestInfo = async (record, text, reminder) => {
  const heading = message.getHeading({ reminder, text });
  const requester = message.getRequester(record);
  const tasks = message.getTasks(record);
  const requestedTimeframe = message.getTimeframe(record);

  const res = await bot.chat.postMessage({
    token,
    channel,
    text,
    blocks: [heading, requester, tasks, requestedTimeframe, followUpButton],
  });

  return res;
};

const sendSecondaryRequestInfo = async (record, text, threadTs) => {
  const subsidyRequested = message.getSubsidyRequest(record);
  const anythingElse = message.getAnythingElse(record);

  return bot.chat.postMessage({
    thread_ts: threadTs,
    token,
    channel,
    text,
    blocks: [subsidyRequested, anythingElse],
  });
};

const sendVolunteerInfo = async (volunteers, taskCounts, text, threadTs) => {
  const volunteerHeading = message.getVolunteerHeading(volunteers);
  const volunteerList = message.getVolunteers(volunteers, taskCounts);
  const volunteerClosing = message.getVolunteerClosing(volunteers);

  return bot.chat.postMessage({
    thread_ts: threadTs,
    token,
    channel,
    text,
    blocks: [volunteerHeading, ...volunteerList, volunteerClosing],
  });
};

const sendCopyPasteNumbers = async (volunteers, threadTs) => {
  const copyPasteNumbers = message.getCopyPasteNumbers(volunteers);

  return bot.chat.postMessage({
    thread_ts: threadTs,
    token,
    channel,
    text: copyPasteNumbers,
  });
};

const sendDispatch = async (
  record,
  volunteers,
  taskCounts,
  reminder = false
) => {
  if (!record) throw new Error("No record passed to sendMessage().");

  const text = message.getText({ reminder });
  const { ts } = await sendPrimaryRequestInfo(record, text, reminder);
  await sendSecondaryRequestInfo(record, text, ts);
  await sendVolunteerInfo(volunteers, taskCounts, text, ts);
  await sendCopyPasteNumbers(volunteers, ts);
};

module.exports = {
  sendDispatch,
};
