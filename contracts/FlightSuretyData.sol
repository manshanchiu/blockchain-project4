pragma solidity >=0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => bool) private authorizedContracts;
    
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }

    struct Airline {
        bool inited;
        bool isRegistered;
        bool isFunded;
        mapping(address => bool) voted; // this airline voted to which airline
        address[] votes; // who voted to me
    }

    struct Insurance {
        bool credited;
        Insuree[] insurees;
    }

    struct Insuree {
        address insuree;
        uint amount;
    }

    mapping(bytes32 => Flight) private flights;
    mapping(address => Airline) private airlines;
    mapping(bytes32 => Insurance) private insurances;
    mapping(address => uint256) private insureeCredits;
    uint256 registeredAirlineCount = 0;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirline
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        // first airline
        registeredAirlineCount++;
        airlines[firstAirline].isRegistered = true;
        airlines[firstAirline].inited = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireCallerAuthorized()
    {
        require(authorizedContracts[msg.sender], "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function authorizeCaller(address a) requireContractOwner requireIsOperational external {
        authorizedContracts[a] = true;
    }

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            external 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address airline
                            )
                            external
                            requireCallerAuthorized
                            requireIsOperational
    {
        registeredAirlineCount++;
        airlines[airline].isRegistered = true;
        airlines[airline].inited = true;
    }

    function voteAirline
                            (   
                                address voter,
                                address airline
                            )
                            external
                            requireCallerAuthorized
                            requireIsOperational
    {
        airlines[voter].voted[airline] = true;
        airlines[airline].votes.push(voter);
    }

    function getRegisteredAirlinesCount() 
                            external
                            view
                            returns(uint) 
    {
        return registeredAirlineCount;
    }

    function isRegisteredAirline(address airline) 
                            external
                            view
                            returns(bool) 
    {
        return airlines[airline].isRegistered;
    }

    function isFundedAirline(address airline) 
                            external
                            view
                            returns(bool) 
    {
        return airlines[airline].isFunded;
    }

    function isVotedAirline(address voter,address airline) 
                            external
                            view
                            returns(bool) 
    {
        return airlines[voter].voted[airline];
    }

    function getVotes(address airline) 
                            external
                            view
                            returns(uint) 
    {
        return airlines[airline].votes.length;
    }

    function fundedAirline(address airline) 
                            external
                            requireCallerAuthorized
                            requireIsOperational
    {
        airlines[airline].isFunded = true;
    }

    function getAirline(address airline)
        external
        view
        returns (bool isRegistered, bool isFunded, bool inited)
    {
        Airline memory _airline = airlines[airline];
        return (_airline.isRegistered, _airline.isFunded, _airline.inited);
    }



    function registerFlight(
                                address airline,
                                uint256 timestamp,
                                bytes32 flightKey
                            )
                            external
                            requireCallerAuthorized
                            requireIsOperational
    {

        require(airlines[airline].isRegistered && airlines[airline].isFunded, "Airline does not exists");
        flights[flightKey] = Flight({
            isRegistered: true,
            statusCode: 0,
            updatedTimestamp: timestamp,
            airline: airline
            
        });

    }

    function isFlightRegistered(bytes32 flightKey) external view returns (bool){
        return flights[flightKey].isRegistered;
    }

    function updateFlight(
                                bytes32 flightKey,
                                address airline,
                                uint256 timestamp,
                                uint8 statusCode
                            )
                            external
                            requireCallerAuthorized
                            requireIsOperational
    {
        flights[flightKey] = Flight({
            isRegistered: true,
            statusCode: statusCode,
            updatedTimestamp: timestamp,
            airline: airline
            
        });

    }



   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (     
                                bytes32 flightKey,
                                address passenger,
                                uint amount                 
                            )
                            external
                            requireCallerAuthorized
                            requireIsOperational
    {
        Insuree memory insuree = Insuree(passenger,amount);
        insurances[flightKey].insurees.push(insuree);
    }

    function isBoughtInsurance(bytes32 flightKey,address passenger) external view returns(bool){
        Insuree[] memory _insurees = insurances[flightKey].insurees;
        bool found = false;
        for (uint i =0; i<_insurees.length;i++){
            if (_insurees[i].insuree == passenger) {
                found = true;
                break;
            }
        }
        return found;
    }

    function isCredited(bytes32 flightKey) external view returns(bool){
        return insurances[flightKey].credited;
    }

    function getInsureeCredit(address insuree) external view returns(uint256){
        return insureeCredits[insuree];
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    bytes32 flightKey
                                )
                                external
                                requireCallerAuthorized
                                requireIsOperational
                                
    {
        Insurance memory insurance = insurances[flightKey];
        Insuree[] memory insurees = insurance.insurees;
        for (uint i =0; i<insurees.length;i++){
            insureeCredits[insurees[i].insuree] += insurees[i].amount.mul(15).div(10);
        }
        insurance.credited = true;
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address insuree
                            )
                            external
                            requireCallerAuthorized
                            requireIsOperational
    {
        insureeCredits[insuree] = 0;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
        if (msg.value > 0) {
            contractOwner.transfer(msg.value);
        }
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

