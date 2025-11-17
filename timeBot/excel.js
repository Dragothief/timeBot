const ExcelJS = require('exceljs');
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('durations.json', 'utf8'));
function worksheetMap(workbook,userId){
  const worksheetList = new Map();
  workbook.eachSheet(function(worksheet, sheetId) {
        worksheetList.set(worksheet.name,sheetId);
  });
   return worksheetList.get(userId);
}

async function createExcelFile() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('habits.xlsx');
  const identifier = Object.keys(data);
  workbook.eachSheet(function(worksheet, sheetId) {
    
    //This is to check if the worksheet is already present in the excel file
    // Then trying to name it with the identifier

    if(identifier.includes(worksheet.name)){
      console.log(worksheet.name);

    }

  });

 
  
 // await workbook.xlsx.writeFile('habits.xlsx');
  console.log('Excel file created successfully.');
}
function formatDate(Date){
  if(typeof Date != 'object'){
    return 0;
  }
  return Date.toISOString().split('T')[0];;
}



async function getDateUpdateCellDuration(date, time,userId){
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('durations.xlsx');
  
  const worksheet = workbook.getWorksheet(1);
  let cellValue =null;

  let formattedTime  =  time / 86400000;
  let formattedDate = date.toISOString().split('T')[0];
  const userList = new Map();
  let newInputRow = countFilledCells(workbook,1,1) + 1;
  // This is to get the row number of the user in the excel file
  worksheet.getColumn(1).eachCell(function(cell, rowNumber) {
  
  if(cell.value != null && cell.value != 'User ID') userList.set(cell.value,rowNumber);
  
});
if(!userList.get(userId)) {
  worksheet.addRow([userId],newInputRow);
  console.log(newInputRow);
  userList.set(userId,newInputRow);
}
  
  const rowNumber = userList.get(userId);
  

  
// This is to get the column number of the date in the excel file
 
try{ worksheet.getRow(1).eachCell(function(cell, colNumber) {
    
   
    
    if(formatDate(cell.value) == formattedDate){
      // This is to get the cell value of the date in the excel file  
      cellValue = worksheet.getRow(rowNumber).getCell(colNumber);
      
   
    }
  }); 
  } catch(err){
    
    return;
  }
  // This is to check if the date is not found in the excel file
   
  if(cellValue == null){
    console.log('Date not found');
    return;
  }

  console.log(cellValue.fullAddress);
  let timefromExcel = new Date(cellValue.value).toISOString().split('T')[1].split('.')[0];
 
  
  if(cellValue.value != null){
    formattedTime = time + sendValuetoMilliseconds(timefromExcel);
    cellValue.value = formattedTime / 86400000;
    cellValue.numFmt = 'hh:mm:ss';  
  } else {
  cellValue.value = formattedTime;
  cellValue.numFmt = 'hh:mm:ss';
  }

 

   await workbook.xlsx.writeFile('durations.xlsx');
   console.log('Excel file updated successfully.');
   console.log(cellValue.value * 86400000 );
 
}

async function getDateUpdateCellHabit(date, input,habitName,userId){
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('habits.xlsx');
  const worksheetList = new Map();
  workbook.eachSheet(function(worksheet, sheetId) {
        worksheetList.set(worksheet.name,sheetId);
  });
  const sheetId = worksheetList.get(userId);
  const worksheet = workbook.getWorksheet(sheetId);
  let cellValue =null;
  const habitList = new Map();
  

  worksheet.getColumn(1).eachCell(function(cell, rowNumber) {
  if(cell.value != null && cell.value != 'Habit Name') habitList.set(cell.value,rowNumber);
  });
  habitRowNumber = habitList.get(habitName);
  console.log(habitRowNumber)

  worksheet.getRow(1).eachCell(function(cell, colNumber) {
    if(formatDate(cell.value) == date){
      //console.log(worksheet.getRow(2).getCell(colNumber).value);      
      cellValue = worksheet.getRow(habitRowNumber).getCell(colNumber);
    }
  });
  
  cellValue.value = input;
  console.log(cellValue.fullAddress);
  if(cellValue == null){
    console.log('Date not found');
    return;
  }
   await workbook.xlsx.writeFile('habits.xlsx');
   console.log('Excel file updated successfully.');
   console.log(cellValue.value);
 }

async function calculateWeeklyProgress() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("habits.xlsx");
  const worksheet = workbook.getWorksheet(1); // Adjust if your data is in a different sheet

  let weeklySums = [];
  let weekSum = 0;
  let dayCount = 0;

  worksheet.getRow(1).eachCell(function(cell, colNumber) {
    // Assuming your data starts from the second row and the value is in the second column
    
    if (colNumber >= 6) {
      const value = worksheet.getRow(2).getCell(colNumber).result; // Adjust the cell index based on where your data is
      console.log(value);
      weekSum += value;
      
      dayCount++;

      // Every 7 days, push the sum to weeklySums and reset
      if (dayCount === 7) {
        console.log(weekSum);
        console.log(formatDate(worksheet.getRow(1).getCell(colNumber).result))
        weeklySums.push(weekSum);
        weekSum = 0; // Reset sum for the next week
        dayCount = 0; // Reset day count for the next week
      }
    }
  });

  // Handle the last week if it doesn't have 7 days
  if (dayCount > 0) {
    weeklySums.push(weekSum);
  }

  return weeklySums;
}

async function calculateMonthlyProgress() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("habits.xlsx");
  const worksheet = workbook.getWorksheet(1); // Adjust if your data is in a different sheet

  let monthlySums = {};
  let MonthSum = 0;
  let currentMonth = null;
  worksheet.getRow(1).eachCell(function(cell, colNumber) {
    // Assuming your data starts from the second row and the value is in the second column
    
    if (colNumber >= 6) {
      const value = worksheet.getRow(2).getCell(colNumber).result; // Adjust the cell index based on where your data is
      const date = worksheet.getRow(1).getCell(colNumber).value;
      const tempValue = worksheet.getRow(2).getCell(6).value;
      
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const monthYearKey = `${month}-${year}`;
     
     // console.log(value);
      
     

      // Every month push the sum to weeklySums and reset
      if (currentMonth !== monthYearKey) {
          if(currentMonth != null){
          monthlySums[currentMonth] = MonthSum;
        }
        currentMonth = monthYearKey;
        MonthSum = 0; // Reset sum for the next Month
            }
      MonthSum += value;
    }
  });

  // Handle the last week if it doesn't have 7 days
  if (currentMonth !== null) {
    monthlySums[currentMonth] = MonthSum;
  }

  console.log(monthlySums)
  return monthlySums;
}

async function addNewHabits(name,goal,frequency,userId){
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('habits.xlsx');
  // Make a function that auto populates a map with habit sheets and habit numbers. 
  // Make sure to fix this because it is only getting the first worksheet not the one that pertaints to the user. 
 
  sheetId = worksheetMap(workbook,userId);
  
  const worksheet = workbook.getWorksheet(sheetId);
  const habitList = new Map();




  worksheet.getColumn(1).eachCell(function(cell, rowNumber) {
  if(cell.value != null && cell.value != 'Habit Name') habitList.set(cell.value,rowNumber);
  });

  if(habitList.has(name)){
    console.log('Habit already exists');
    return;
  }
  const rowNumber = worksheet.rowCount + 1;
  worksheet.getRow(rowNumber).getCell(1).value = name;
  worksheet.getRow(rowNumber).getCell(2).value = goal;
  worksheet.getRow(rowNumber).getCell(3).value = frequency;
  console.log(worksheet.getRow(rowNumber).getCell(1).value);
  console.log(worksheet.getRow(rowNumber).getCell(2).value);
  console.log(worksheet.getRow(rowNumber).getCell(3).value);
  console.log(habitList);
  await workbook.xlsx.writeFile('habits.xlsx');
  console.log('Habit added successfully.');




}
function sendValuetoMilliseconds(time) {
  let timeArray = time.split(':');
  let hours = parseInt(timeArray[0]);
  let minutes = parseInt(timeArray[1]);
  let seconds = parseInt(timeArray[2]);
  totalTimeMilliseconds = (hours * 3.6e+6) + (minutes * 60000) + (seconds * 1000);
  return totalTimeMilliseconds;
}

function countFilledCells(workbook, sheetName, column) {
  let worksheet = workbook.getWorksheet(sheetName);
  let filledCells = 0;

  // Iterate over each cell in the specified column
  worksheet.getColumn(column).eachCell({ includeEmpty: false }, function(cell, rowNumber) {
      if (cell.value !== null) {
          filledCells++;
      }
  });

  return filledCells;
}









let currentDate = new Date();

;


//getDateUpdateCell(currentDate, "4km").catch(err => console.error(err));
// calculateWeeklyProgress()
//   .then(weeklySums => {
//     console.log('Weekly sums:', weeklySums);
//   })
//   .catch(console.error);


// calculateMonthlyProgress().then(MonthlySums => {
//   console.log('Monthly sums:', MonthlySums);
// }).catch(console.error);

// Export code 

// getDateUpdateCell(currentDate, 25,"work out","256934873615302666").catch(err => console.error(err));

//addNewHabits("code",5,"daily","478742926206173190").catch(err => console.error(err));
//createExcelFile().catch(err => console.error(err));
//getDateUpdateCell(currentDate,2,"work out","256934873615302666").catch(err => console.error(err));
//getDateUpdateCellDuration(currentDate, 3213301,"478742926206173190").catch(err => console.error(err));


module.exports = {
  createExcelFile,
  getDateUpdateCellHabit,
  calculateWeeklyProgress,
  calculateMonthlyProgress,
  addNewHabits,
  getDateUpdateCellDuration
};