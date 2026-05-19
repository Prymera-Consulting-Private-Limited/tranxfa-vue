# Monthly Budget API Documentation

## Overview

The Monthly Budget APIs allow customers to:

- Create a monthly budget for a specific currency
- Retrieve current active monthly budgets
- Retrieve historical monthly budgets

Base URL:

```text
http://api.moneytransfer.app.localhost:8000/client/v1
```

---

# Authentication

All endpoints require authenticated client access.

Example headers:

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

---

# 1. Create Monthly Budget

## Endpoint

```http
POST /monthly-budgets
```

## Description

Creates a new monthly budget for a given currency.

---

## Request Body

| Field       | Type   | Required | Description           |
|-------------|--------|----------|-----------------------|
| currency_id | UUID   | Yes      | Currency identifier   |
| amount      | Number | Yes      | Monthly budget amount |

---

## Example Request

```json
{
    "currency_id": "299e5c3d-0485-4b04-9249-39d87fd8e0a3",
    "amount": 1000
}
```

---

## Success Response

### HTTP Status

```http
200 OK
```

### Response Body

```json
{
    "id": "a1cb7546-d93a-40fe-b2eb-7c2994509277",
    "budget": 1000,
    "budget_formatted": "1,000.00",
    "budget_formatted_currency_prefixed": "£ 1,000.00",
    "spent": 0,
    "spent_formatted": "0.00",
    "spent_formatted_currency_prefixed": "£ 0.00",
    "remaining": 1000,
    "remaining_formatted": "1,000.00",
    "remaining_formatted_currency_prefixed": "£ 1,000.00",
    "utilization_percentage": "0%",
    "currency": {
        "id": "299e5c3d-0485-4b04-9249-39d87fd8e0a3",
        "decimal_places": 2,
        "iso_numeric": 826,
        "type": "FIAT",
        "crypto_code": null,
        "iso_alpha": "GBP",
        "common_name": "British pound",
        "official_name": "British pound",
        "icon_unicode": "£",
        "code": "GBP",
        "salary_ranges": null
    }
}
```

---

## Validation Error Response

### HTTP Status

```http
422 Unprocessable Entity
```

### Response Body

```json
{
    "message": "The currency id field is required.",
    "errors": {
        "currency_id": [
            "The currency id field is required."
        ]
    }
}
```

---

# 2. Get Monthly Budget History

## Endpoint

```http
GET /monthly-budgets/history
```

## Description

Returns paginated historical monthly budgets for the authenticated customers.

---

## Success Response

### HTTP Status

```http
200 OK
```

### Response Body

```json
{
    "data": [
        {
            "id": "a1cb7546-d93a-40fe-b2eb-7c2994509277",
            "budget": 1000,
            "budget_formatted": "1,000.00",
            "budget_formatted_currency_prefixed": "£ 1,000.00",
            "spent": 0,
            "spent_formatted": "0.00",
            "spent_formatted_currency_prefixed": "£ 0.00",
            "remaining": 1000,
            "remaining_formatted": "1,000.00",
            "remaining_formatted_currency_prefixed": "£ 1,000.00",
            "utilization_percentage": "0%",
            "currency": {
                "id": "299e5c3d-0485-4b04-9249-39d87fd8e0a3",
                "decimal_places": 2,
                "iso_numeric": 826,
                "type": "FIAT",
                "crypto_code": null,
                "iso_alpha": "GBP",
                "common_name": "British pound",
                "official_name": "British pound",
                "icon_unicode": "£",
                "code": "GBP",
                "salary_ranges": null
            }
        }
    ],
    "pagination": {
        "total": 1,
        "count": 1,
        "per_page": 25,
        "current_page": 1,
        "total_pages": 1,
        "links": {
            "self": "http://api.moneytransfer.app.localhost:8000/client/v1/monthly-budgets/history",
            "next": null,
            "prev": null
        }
    }
}
```

---

# 3. Get Current Monthly Budgets

## Endpoint

```http
GET /monthly-budgets/current
```

## Description

Returns paginated currently active monthly budgets for the authenticated customers.

---

## Success Response

### HTTP Status

```http
200 OK
```

### Response Body

```json
{
    "data": [
        {
            "id": "a1cb7546-d93a-40fe-b2eb-7c2994509277",
            "budget": 1000,
            "budget_formatted": "1,000.00",
            "budget_formatted_currency_prefixed": "£ 1,000.00",
            "spent": 0,
            "spent_formatted": "0.00",
            "spent_formatted_currency_prefixed": "£ 0.00",
            "remaining": 1000,
            "remaining_formatted": "1,000.00",
            "remaining_formatted_currency_prefixed": "£ 1,000.00",
            "utilization_percentage": "0%",
            "currency": {
                "id": "299e5c3d-0485-4b04-9249-39d87fd8e0a3",
                "decimal_places": 2,
                "iso_numeric": 826,
                "type": "FIAT",
                "crypto_code": null,
                "iso_alpha": "GBP",
                "common_name": "British pound",
                "official_name": "British pound",
                "icon_unicode": "£",
                "code": "GBP",
                "salary_ranges": null
            }
        }
    ],
    "pagination": {
        "total": 1,
        "count": 1,
        "per_page": 25,
        "current_page": 1,
        "total_pages": 1,
        "links": {
            "self": "http://api.moneytransfer.app.localhost:8000/client/v1/monthly-budgets/current",
            "next": null,
            "prev": null
        }
    }
}
```
