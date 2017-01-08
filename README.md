# FibaroEchoSkill


1. Create AWS acocunt
2. Create Custom Skill with your favorite name
  1. Language: German
  2. Invocation Name: Name you must use to access this skill via Echo
  3. Service Endpoint: "AWS Lambda" and select Europe
  4. Note the "Application ID" (can be found below Skill Information)
3. Modify option.js (enter Dyndns, Port, Authentication/login informations (admin account of HC2))
4. zip all three *.js files as one zip file without encryption, protection and (sub-)folders
5. Create blanc Lambda-Function:
  1. https://eu-west-1.console.aws.amazon.com/lambda/home?region=eu-west-1#/functions?display=list
  2. Runtime: Node.js
  3. Trigger Function: Alexa Skills Kit
  4. Write down Skill ID
  5. Upload ZIP-File
  6. Name it as whatever you want
6. Enter Lambda-Skill-ID below the box of "Europe" at the AWS page of you Custom Skill
7. Copy&Paste:
  1. utterances.txt to "Sample Utterances"
  2. intents.txt to "Intents"
  3. Create lots of custom slots with Name in capital letters as used in the slot_*.txt files (* is the name of the custom slot)
  4. Insert content of each slot-file to the corresponding custom slot

 
