# Excel Template Guide

## Required Columns

Your Excel manifest must contain these columns (column names are case-insensitive):

### 1. Date
- **Accepted Names**: `Date`, `date`
- **Format**: Any valid date format (e.g., `2023-12-25`, `12/25/2023`)
- **Purpose**: Used for sorting documents chronologically

### 2. Document Type
- **Accepted Names**: `Document Type`, `docType`, `type`
- **Format**: Text string
- **Purpose**: Identifies the type of document
- **Examples**:
  - Invoice
  - Contract
  - Expense Report
  - Safety Incident
  - HR Complaint

### 3. Pages
- **Accepted Names**: `Pages`, `pages`, `Page Range`
- **Format**: Page number(s) or range
- **Supported Formats**:
  - Single page: `5`
  - Range: `1-10`
  - Multiple pages: `1,3,5,7`
  - Mixed: `1-5,8,10-12`
- **Purpose**: Specifies which pages from the master PDF to extract

### 4. Note (Optional)
- **Accepted Names**: `Note`, `note`, `Notes`
- **Format**: Text string
- **Purpose**: Additional information or description
- **Examples**: "Original copy", "Urgent review needed"

## Example Excel Sheet

| Date | Document Type | Pages | Note |
|------|--------------|-------|------|
| 2023-12-25 | Expense Report | 1-5 | Santa bribes |
| 2023-01-01 | New Year Resolution | 6 | Abandoned immediately |
| 2023-07-04 | Safety Incident | 7-8 | Fireworks in breakroom |
| 2023-10-31 | Invoice | 9 | Costume budget |
| 2023-02-14 | HR Complaint | 10-12 | Unwanted serenade |
| 2023-05-05 | Contract | 13 | Taco Tuesday Agreement |
| 2023-09-15 | Audit | 14-20 | IRS Panic |

## Tips

1. **Keep it Simple**: Use clear, descriptive document types
2. **Valid Dates**: Ensure dates are in a recognizable format
3. **Page Ranges**: Make sure page numbers exist in your PDF
4. **Save Format**: Save as `.xlsx`, `.xls`, or `.csv`

## Processing Behavior

1. The app will parse your Excel file
2. Display all rows in a table
3. You can search/filter the documents
4. Select which documents to include
5. Documents are sorted by date (oldest to newest)
6. Pages are extracted in the order specified
7. Bates numbers are applied sequentially (if enabled)

## Common Issues

### Issue: "No documents found"
**Solution**: Check that your Excel has the required column names

### Issue: "Invalid page range"
**Solution**: Ensure page numbers don't exceed the total pages in your PDF

### Issue: "Parsing failed"
**Solution**:
- Check file format (should be .xlsx, .xls, or .csv)
- Ensure no empty rows at the top
- Verify column headers are in the first row

## Download Template

You can create a template Excel file with these exact columns, then populate it with your document data.
