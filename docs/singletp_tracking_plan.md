# singletp Tracking Plan


## Purchase Completed

<!-- tabs:start -->
### **Details**

#### **Description**

No description provided
#### **Properties**

| **Name** | `Type` | Description | Required? |
| :--- | :--- | :--- | :--- |
| **products** | `array` | No description | ❌ |
| **products.items** | `object` | Contains the structure for array items | ❌ |
| **products.items.id** | `string` | No description | ❌ |
| **products.items.price** | `string` | No description | ❌ |
#### **JS**

```javascript
analytics.track("Purchase Completed", {
  "products": [
    {
      "id": "<<type: string, required: false>>",
      "price": "<<type: string, required: false>>"
    }
  ]
})
```

<!-- tabs:end -->

<!-- panels:end -->


## Segment Consent Preference Updated

<!-- tabs:start -->
### **Details**

#### **Description**

DO NOT EDIT. Event generated to store end users consent preferences for Unify and Twilio Engage.
#### **Properties**

| **Name** | `Type` | Description | Required? |
| :--- | :--- | :--- | :--- |
#### **JS**

```javascript
analytics.track("Segment Consent Preference Updated", {})
```

<!-- tabs:end -->

<!-- panels:end -->
