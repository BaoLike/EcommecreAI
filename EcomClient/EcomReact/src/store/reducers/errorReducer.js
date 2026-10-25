const initialState = {
    isLoading: false,
    messageError: null,
    categoryLoader: false,
    categoryError: null,
    btnLoader: false,
}

export const errorReducer = (state = initialState, action) => {
    switch(action.type){
        case "IS_FETCHING":
            return {
                ...state,
                isLoading: true,
                messageError: null,
            }
        case "IS_SUCCESS":
            return {
                ...state,
                isLoading: false,
                messageError: null,
            }
        case "IS_ERROR":
            return {
                ...state,
                isLoading: false,
                messageError: action.payload,
            }

        case "CATEGORY_SUCCESS":
            return {
                ...state,
                categoryLoader: false,
                 messageError: null,
               categoryError: null
            }
        case "CATEGORY_LOADER":
            return {
                ...state,
                categoryLoader: true,
                 messageError: null,
               categoryError: null
            }

        default:
            return state;
    }
};