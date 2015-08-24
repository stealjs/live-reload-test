#!/usr/bin/env node
require("../main");

process.on('disconnect', function() {
  console.log('parent exited')
  process.exit();
});
