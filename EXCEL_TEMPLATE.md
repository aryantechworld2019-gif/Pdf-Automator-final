# Excel Template Guide

## Required Columns

Your Excel manifest must contain these columns:

### 1. Date (FIRST COLUMN)
- **Position**: **MUST be the first column (Column A)**
- **Header Name**: Can be ANYTHING (e.g., `Date`, `Transaction Date`, `Doc Date`, `When`, etc.)
- **Format**: Any valid date format (text or date)
  - `2023-12-25`
  - `12/25/2023`
  - `Dec 25, 2023`
  - Even text like `2023-12-25` works
- **Purpose**: Used for sorting documents chronologically
- **Important**: The system will ALWAYS treat the first column as the date, regardless of the header name

### 2. Document Type (Any Position)
- **Header Detection**: System looks for headers containing:
  - `document` (case-insensitive)
  - `type` (case-insensitive)
  - `doctype` (case-insensitive)
- **Accepted Names**: `Document Type`, `Doc Type`, `Type`, `docType`, `Document`, etc.
- **Format**: Text string
- **Purpose**: Identifies the type of document
- **Examples**:
  - Invoice
  - Contract
  - Expense Report
  - Safety Incident
  - HR Complaint

### 3. Pages (Any Position)
- **Header Detection**: System looks for headers containing:
  - `page` (case-insensitive)
  - `pages` (case-insensitive)
- **Accepted Names**: `Pages`, `Page Range`, `Page Numbers`, `Page`, etc.
- **Format**: Page number(s) or range
- **Supported Formats**:
  - Single page: `5`
  - Range: `1-10`
  - Multiple pages: `1,3,5,7`
  - Mixed: `1-5,8,10-12`
- **Purpose**: Specifies which pages from the master PDF to extract

### 4. Note (Any Position, Optional)
- **Header Detection**: System looks for headers containing:
  - `note` (case-insensitive)
- **Accepted Names**: `Note`, `Notes`, `Comments`, etc.
- **Format**: Text string
- **Purpose**: Additional information or description
- **Examples**: "Original copy", "Urgent review needed"

## Example Excel Sheets

### Example 1: Standard Headers
| Date | Document Type | Pages | Note |
|------|--------------|-------|------|
| 2023-12-25 | Expense Report | 1-5 | Santa bribes |
| 2023-01-01 | New Year Resolution | 6 | Abandoned immediately |
| 2023-07-04 | Safety Incident | 7-8 | Fireworks in breakroom |
| 2023-10-31 | Invoice | 9 | Costume budget |
| 2023-02-14 | HR Complaint | 10-12 | Unwanted serenade |
| 2023-05-05 | Contract | 13 | Taco Tuesday Agreement |
| 2023-09-15 | Audit | 14-20 | IRS Panic |

### Example 2: Custom Headers (Also Works!)
| Transaction Date | Doc Type | Page Range | Comments |
|-----------------|----------|------------|----------|
| 12/25/2023 | Invoice | 1-3 | Q4 billing |
| 01/15/2024 | Contract | 4-6 | New client |
| 02/01/2024 | Receipt | 7 | Office supplies |

### Example 3: Minimal Headers (Still Works!)
| When | What | Where | Why |
|------|------|-------|-----|
| 2023-12-25 | Invoice | 1-5 | Year-end |
| 2024-01-01 | Contract | 6-10 | New year |

**Note**: As long as:
- ✅ First column contains dates
- ✅ One column has "type" or "document" in the header
- ✅ One column has "page" in the header

The system will work correctly!

## Important Rules

1. **First Column is ALWAYS Date**:
   - ⚠️ CRITICAL: The first column (Column A) must contain dates
   - The header name doesn't matter - can be anything
   - But it must be in the first position

2. **Column Order Doesn't Matter** (except for date):
   - Document Type, Pages, and Notes can be in any order
   - System will auto-detect them by header names

3. **Header Names are Flexible**:
   - System searches for keywords in headers (case-insensitive)
   - "Document Type" = "Doc Type" = "Type" = "Document"
   - "Pages" = "Page Range" = "Page Numbers" = "Page"
   - "Note" = "Notes" = "Comments"

## Tips

1. **Keep it Simple**: Use clear, descriptive document types
2. **Valid Dates**: Ensure dates are in a recognizable format (text or date cells both work)
3. **Page Ranges**: Make sure page numbers exist in your PDF
4. **Save Format**: Save as `.xlsx`, `.xls`, or `.csv`
5. **First Column**: Always put dates in Column A (first column)

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
