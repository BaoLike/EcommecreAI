import { Step, StepLabel, Stepper } from "@mui/material";
import React, { useEffect, useState } from "react";
import AddressInfor from "./AddressInfor";
import { useDispatch } from "react-redux";
import { fetchLocations } from "../../store/reducers/LocateReducer";
import PaymentMethodComponent from "./PaymentMethod";
import OrderSummary from "./OrderSummary";

const Checkout = () => {

    const [activeStep, setActiveStep] = useState(0);


    const steps = [
        "Addtress",
        "Order Summary",
        "Payment Method",
    ];



    return (
        <div className="py-14 min-h-[calc(100vh-100px)]">
            <Stepper activeStep={activeStep}>
                {steps.map((label, index) => (
                    <Step key={index}>
                        <StepLabel>
                            {label}
                        </StepLabel>
                    </Step>
                ))}
            </Stepper>

            <div className="mt-5">
                {activeStep === 0 && <AddressInfor onNext={() => setActiveStep(1)} />}
                {activeStep === 1 && <OrderSummary onNext={() => setActiveStep(2)} onBack={() => setActiveStep(0)}/>}
                {activeStep === 2 && <PaymentMethodComponent onNext={() => setActiveStep(3)}/>}
                {activeStep === 3 && <div>Payment Component</div>}
            </div>
        </div>
    )
}

export default Checkout;