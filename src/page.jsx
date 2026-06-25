import React from "react"
import "./style.css"

function Button() {
    return <button className="p-4 rounded-md bg-blue-500 text-white hover:bg-blue-600" >Cliquer ici</button>
}

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Button />
            <Button />
            <Button />
            <Button />
        </div>
    )
}