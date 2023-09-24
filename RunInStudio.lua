local COOKIE = "YOUR-COOKIE-HERE"
local ToSpoofID = GenerateIDList()

local idToInstance = {}

local function SendPOST(ids: {any}, cookie: string?)
  game:GetService("HttpService"):PostAsync("http://127.0.0.1:6969/", game:GetService("HttpService"):JSONEncode({["ids"]=ids, ["cookie"]=cookie and cookie or nil}))
end

local function PollForResponse(): {any}
	local response
	while not response and wait(4) do
		response = game:GetService("HttpService"):JSONDecode(game:GetService("HttpService"):GetAsync("http://127.0.0.1:6969/"))
	end
	return response
end

local function GenerateIDList(): {any}
	local ids = {}
	for i,v in pairs(game:GetDescendants()) do
		pcall(function()
			if v:IsA("Animation") then
				ids[v.Name] = v.AnimationId:match("%d+")
				idToInstance[tonumber(v.AnimationId:match("%d+"))] = v
			end
		end)
	end
	return ids
end	

SendPOST(ToSpoofID, COOKIE)
local newIDList = PollForResponse()

for oldID,newID in pairs(newIDList) do
	idToInstance[tonumber(oldID)].AnimationId = "rbxassetid://"..tostring(newID)
end
