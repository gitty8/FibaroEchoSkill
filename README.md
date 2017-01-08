# FibaroEchoSkill


1.) Create AWS acocunt
2.) Create Custom Skill with your favorite name
  a) Language: German
  b) Invocation Name: Name you must use to access this skill via Echo
  c) Service Endpoint: "AWS Lambda" and select Europe
  d) Note the "Application ID" (can be found below Skill Information)
3.) Modify option.js (enter Dyndns, Port, Authentication/login informations (admin account of HC2))
4.) zip all three *.js files as one zip file without encryption, protection and (sub-)folders
5.) Create blanc Lambda-Function:
  a) https://eu-west-1.console.aws.amazon.com/lambda/home?region=eu-west-1#/functions?display=list
  b) Runtime: Node.js
  c) Trigger Function: Alexa Skills Kit
  d) Write down Skill ID
  e) Upload ZIP-File
  d) Name it as whatever you want
6.) Enter Lambda-Skill-ID below the box of "Europe" at the AWS page of you Custom Skill
7.) Copy&Paste:
  a) utterances.txt to "Sample Utterances"
  b) intents.txt to "Intents"
  c) Create lots of custom slots with Name in capital letters as used in the slot_*.txt files (* is the name of the custom slot)
  d) Insert content of each slot-file to the corresponding custom slot

 
