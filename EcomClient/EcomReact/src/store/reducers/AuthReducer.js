const initialState = {
    user: null,
    address: []
}

export const AuthReducer = (state = initialState, action) => {
    if(action.type === "LOGIN_USER"){
        return {...state, user: action.payload}
    }
    if(action.type === "LOG_OUT") return {...state, user: null};
    return state;
}
