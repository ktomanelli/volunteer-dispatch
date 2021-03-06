/* eslint-disable consistent-return */
require("dotenv").config();
const config = require("../../config");
const { getDisplayNumber } = require("./phone-number-utils");

const getSection = (text) => ({
  type: "section",
  text: {
    type: "mrkdwn",
    text,
  },
});

const getText = (options) => {
  return options.reminder
    ? "Reminder for a previous request"
    : "A new errand has been added";
};

const getHeading = (options) => {
  if (options.reminder) {
    return getSection(`:alarm_clock: *${options.text}* :alarm_clock:`);
  }

  return getSection(`:exclamation: *${options.text}* :exclamation:`);
};

const pluralize = (num, str) => {
  const sMaybe = num === 1 ? "" : "s";
  return `${num} ${str}${sMaybe}`;
};

const getLanguage = (record) => {
  const languages = [record.get("Language"), record.get("Language - other")];
  const languageList = languages.filter((language) => language).join(", ");

  const formattedLanguageList = `${
    languageList.length ? languageList : "None provided"
  }`;

  return formattedLanguageList;
};

const getRequester = (record) => {
  const heading = "*Requester:*";
  const recordURL = `${config.AIRTABLE_REQUESTS_VIEW_URL}/${record.id}`;
  const requesterName = record.get("Name");
  const requesterNumber = record.get("Phone number");
  const requesterAddress = record.get("Address");

  const displayNameLink = `<${recordURL}|:heart: ${
    requesterName || "No name provided"
  }>`;
  const displayNumber = `:phone: ${getDisplayNumber(requesterNumber)}`;
  const displayAddress = `:house: ${requesterAddress || "None provided"}`;
  const displayLanguage = `:speaking_head_in_silhouette: ${getLanguage(
    record
  )}`;

  const requesterInfo = [
    heading,
    displayNameLink,
    displayNumber,
    displayAddress,
    displayLanguage,
  ];

  const requesterSection = getSection(requesterInfo.join("\n"));

  return requesterSection;
};

const formatTasks = (record) => {
  const tasks = record.get("Tasks");
  const otherTasks = record.get("Task - other");

  if (!tasks && !otherTasks) return "None provided";

  // Put each task on a new line
  let formattedTasks = "";
  if (tasks) {
    formattedTasks = record.get("Tasks").reduce((taskList, task) => {
      let msg = `${taskList}\n :small_orange_diamond: ${task}`;
      if (task === "Other") {
        msg +=
          '\n\t\t:warning: Because this is an "Other" request, these volunteer matches might not be the best options, depending on what the request is. :warning:';
      }
      return msg;
    }, "");
  }

  if (otherTasks) {
    formattedTasks += `\n :small_orange_diamond: ${otherTasks}`;
  }

  return formattedTasks;
};

const getTasks = (record) => {
  const tasks = formatTasks(record);
  const tasksSection = getSection(`*Needs assistance with:* ${tasks}`);

  return tasksSection;
};

const getSubsidyRequest = (record) => {
  const subsidy = record.get(
    "Please note, we are a volunteer-run organization, but may be able to help offset some of the cost of hard goods. Do you need a subsidy for your assistance?"
  )
    ? ":white_check_mark:"
    : ":no_entry_sign:";

  const subsidySection = getSection(`*Subsidy requested:* ${subsidy}`);

  return subsidySection;
};

const getTimeframe = (record) => {
  const timeframe = record.get("Timeframe");
  const timeframeSection = getSection(
    `*Requested timeframe:* ${timeframe || "None provided"}`
  );

  return timeframeSection;
};

const truncateLongResponses = (response, recordId) => {
  const charLimit = 2000;
  let truncatedResponse;

  if (response.length > 2000) {
    const recordURL = `${config.AIRTABLE_REQUESTS_VIEW_URL}/${recordId}`;

    truncatedResponse = response.substring(0, charLimit);
    truncatedResponse += `... <${recordURL}|See Airtable record for full response.>`;
  }

  return truncatedResponse || response;
};

const getAnythingElse = (record) => {
  const anythingElse = record.get("Anything else") || "";
  const truncatedResponse = truncateLongResponses(anythingElse, record.id);

  const anythingElseSection = getSection(
    `*Other notes from requester:* \n${truncatedResponse || "None provided"}`
  );

  return anythingElseSection;
};

const getVolunteerHeading = (volunteers) => {
  if (!volunteers || !volunteers.length) {
    // No volunteers found
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    return getSection(noneFoundText);
  }
  const volunteerHeading = `*Here are the ${volunteers.length} closest volunteers:*`;
  return getSection(volunteerHeading);
};

const getVolunteers = (volunteers, taskCounts) => {
  if (!volunteers || !volunteers.length || !taskCounts) {
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    return [getSection(noneFoundText)];
  }

  const volunteerSections = volunteers.map((volunteer) => {
    const volunteerURL = `${config.AIRTABLE_VOLUNTEERS_VIEW_URL}/${volunteer.record.id}`;
    const volunteerLink = `<${volunteerURL}|${volunteer.Name}>`;
    const displayNumber = getDisplayNumber(volunteer.Number);
    const volunteerDistance =
      typeof volunteer.Distance === "number"
        ? `${volunteer.Distance.toFixed(2)} Mi.`
        : "Distance N/A";
    const taskCount = taskCounts.has(volunteer.Id)
      ? pluralize(taskCounts.get(volunteer.Id), "assigned task")
      : pluralize(0, "assigned task");

    const volunteerLine = `:wave: ${volunteerLink}\n 
    ${displayNumber} - ${volunteerDistance} - ${taskCount}`;
    const volunteerSection = getSection(volunteerLine);

    return volunteerSection;
  });

  return volunteerSections;
};

const getVolunteerClosing = (volunteers) => {
  if (!volunteers || !volunteers.length) {
    const noneFoundText =
      "*No volunteers match this request!*\n*Check the full Airtable record, there might be more info there.*";

    return getSection(noneFoundText);
  }

  const volunteerClosing =
    "_For easy copy/paste, see the reply to this message:_";

  return getSection(volunteerClosing);
};

const getCopyPasteNumbers = (volunteers) => {
  if (!volunteers || !volunteers.length) return "No numbers to display";

  const simplePhoneList = volunteers
    .map((volunteer) => getDisplayNumber(volunteer.Number))
    .join("\n");

  return simplePhoneList;
};

module.exports = {
  getText,
  getHeading,
  getRequester,
  getTasks,
  getTimeframe,
  getSubsidyRequest,
  getAnythingElse,
  getVolunteerHeading,
  getVolunteers,
  getVolunteerClosing,
  getCopyPasteNumbers,
  getSection,
};
