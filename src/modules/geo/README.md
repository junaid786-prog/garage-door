# Geo Module

The geo module handles geolocation services, ZIP code validation, and service area management for A1 Garage Door Service.

## Overview

This module provides:
- ZIP code to location data mapping
- Coordinate-based location lookup
- Service area validation
- Distance calculations between points
- Legacy API compatibility

## API Endpoints

### GET `/api/geo/`
Legacy endpoint for backward compatibility.

**Query Parameters:**
- `zip` (optional): ZIP code to lookup

**Response:**
```json
{
  "success": true,
  "data": {
    "zip": "85251",
    "city": "Scottsdale",
    "state": "AZ",
    "serviceArea": true
  }
}
```

### GET `/api/geo/zip/:zipCode`
Get location data by ZIP code.

**Parameters:**
- `zipCode`: 5-digit ZIP code (e.g., 85251)

**Response:**
```json
{
  "success": true,
  "data": {
    "zip": "85251",
    "city": "Scottsdale",
    "state": "AZ",
    "county": "Maricopa",
    "coordinates": {
      "latitude": 33.4942,
      "longitude": -111.9261
    },
    "timezone": "America/Phoenix",
    "serviceArea": true
  }
}
```

### GET `/api/geo/coordinates`
Get location data by coordinates.

**Query Parameters:**
- `latitude`: Latitude coordinate (-90 to 90)
- `longitude`: Longitude coordinate (-180 to 180)

**Response:**
```json
{
  "success": true,
  "data": {
    "coordinates": {
      "latitude": 33.4942,
      "longitude": -111.9261
    },
    "zip": "85251",
    "city": "Phoenix",
    "state": "AZ",
    "county": "Maricopa",
    "timezone": "America/Phoenix",
    "serviceArea": true
  }
}
```

### GET `/api/geo/validate/:zipCode`
Validate if ZIP code is in service area.

**Parameters:**
- `zipCode`: 5-digit ZIP code to validate

**Response:**
```json
{
  "success": true,
  "data": {
    "zipCode": "85251",
    "isServiceable": true,
    "message": "Service available in this area",
    "estimatedServiceRadius": "25 miles"
  }
}
```

### GET `/api/geo/service-areas`
Get all serviceable areas.

**Response:**
```json
{
  "success": true,
  "data": {
    "zipCodes": ["85001", "85002", "85251", "85252"],
    "cities": ["Phoenix", "Scottsdale", "Tempe", "Mesa"],
    "states": ["AZ"],
    "serviceRadius": "25 miles from Phoenix metro area",
    "lastUpdated": "2025-11-13T15:30:00.000Z"
  }
}
```

### POST `/api/geo/distance`
Calculate distance between two points.

**Request Body:**
```json
{
  "point1": {
    "latitude": 33.4484,
    "longitude": -112.0740
  },
  "point2": {
    "latitude": 33.4942,
    "longitude": -111.9261
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "distance": 8.32,
    "unit": "miles",
    "point1": {
      "latitude": 33.4484,
      "longitude": -112.0740
    },
    "point2": {
      "latitude": 33.4942,
      "longitude": -111.9261
    }
  }
}
```

## Architecture

### Files Structure
```
src/modules/geo/
├── controller.js    # Request handlers and validation
├── service.js       # Business logic for geolocation
├── routes.js        # Route definitions and middleware
├── validator.js     # Input validation schemas
└── README.md        # Documentation (this file)
```

### Dependencies
- **Joi**: Input validation and schema enforcement
- **Express**: Web framework for routing
- **APIResponse**: Standardized response formatting

## Service Layer Methods

### `getLocationByZip(zipCode)`
Retrieve location data for a given ZIP code.

**Parameters:**
- `zipCode` (string): 5-digit ZIP code

**Returns:** Promise resolving to location data object

### `getLocationByCoordinates(latitude, longitude)`
Retrieve location data for given coordinates.

**Parameters:**
- `latitude` (number): Latitude coordinate
- `longitude` (number): Longitude coordinate

**Returns:** Promise resolving to location data object

### `validateServiceArea(zipCode)`
Check if ZIP code is within service area.

**Parameters:**
- `zipCode` (string): ZIP code to validate

**Returns:** Promise resolving to validation result

### `getServiceableAreas()`
Get list of all serviceable ZIP codes and areas.

**Returns:** Promise resolving to service area data

### `calculateDistance(point1, point2)`
Calculate distance between two coordinate points.

**Parameters:**
- `point1` (object): First coordinate point
- `point2` (object): Second coordinate point

**Returns:** Promise resolving to distance calculation

## Validation

All endpoints include proper input validation:

- **ZIP Code Format**: Must be 5 digits (12345) or 5+4 format (12345-1234)
- **Coordinates**: Latitude (-90 to 90), Longitude (-180 to 180)
- **Required Fields**: Enforced with descriptive error messages

## Error Handling

The module follows standard error handling patterns:
- Validation errors return 400 Bad Request
- Server errors return 500 Internal Server Error
- All errors include descriptive messages

## Current Implementation

**⚠️ Note: This is currently a dummy implementation**

The service layer contains dummy data for development purposes. In production, this should be replaced with:

- Real geolocation API integration (Google Maps, HERE, MapBox)
- Database of serviceable ZIP codes
- Actual service area boundaries
- Real coordinate-to-address mapping

### Dummy Data Features

- Hardcoded ZIP codes: 85001-85010, 85251-85260, 85301-85310
- Dummy cities: Phoenix, Scottsdale, Glendale
- Fixed coordinates for major Arizona cities
- Simulated service area validation

## Integration Notes

### Frontend Integration
The legacy endpoint maintains backward compatibility with existing frontend code while new endpoints provide enhanced functionality.

### External APIs
When implementing real geolocation services, consider:
- API rate limiting
- Caching strategies
- Fallback mechanisms
- Cost optimization

### Database Integration
For production, consider storing:
- Service area polygons
- ZIP code lookup tables
- Historical geocoding results
- Service coverage maps

## Testing

Test the endpoints using curl or Postman:

```bash
# Get location by ZIP
curl "http://localhost:3000/api/geo/zip/85251"

# Get location by coordinates
curl "http://localhost:3000/api/geo/coordinates?latitude=33.4942&longitude=-111.9261"

# Validate service area
curl "http://localhost:3000/api/geo/validate/85251"

# Calculate distance
curl -X POST "http://localhost:3000/api/geo/distance" \
  -H "Content-Type: application/json" \
  -d '{
    "point1": {"latitude": 33.4484, "longitude": -112.0740},
    "point2": {"latitude": 33.4942, "longitude": -111.9261}
  }'
```

## Future Enhancements

1. **Real API Integration**: Replace dummy data with actual geolocation services
2. **Caching Layer**: Implement Redis caching for frequent lookups
3. **Service Area Polygons**: Support complex service boundary shapes
4. **Routing Integration**: Add driving distance and time calculations
5. **Address Validation**: Full address validation and standardization
6. **Geocoding History**: Store and track geocoding results