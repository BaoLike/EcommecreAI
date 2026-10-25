// Action Types
import api from '../../api/api';

export const SET_LOCATIONS = 'SET_LOCATIONS';
export const ADD_LOCATION = 'ADD_LOCATION';
export const CLEAR_LOCATIONS = 'CLEAR_LOCATIONS';

// Initial State
const initialState = {
  locations: []
};

// Reducer
const locationReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_LOCATIONS:
      return {
        ...state,
        locations: action.payload
      };

    case ADD_LOCATION:
      return {
        ...state,
        locations: [...state.locations, action.payload]
      };

    case CLEAR_LOCATIONS:
      return initialState;

    default:
      return state;
  }
};

// Action Creators
export const setLocations = (locations) => ({
  type: SET_LOCATIONS,
  payload: locations
});

export const addLocation = (location) => ({
  type: ADD_LOCATION,
  payload: location
});

export const clearLocations = () => ({
  type: CLEAR_LOCATIONS
});

// Async Action - Fetch locations from API
export const fetchLocations = () => {
  return async (dispatch) => {
    try {
      const { data } = await api.get('/public/addresses');
      dispatch(setLocations(data));
      return data;
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  };
};

// Selectors
export const selectLocations = (state) => state.location.locations;

export default locationReducer;
